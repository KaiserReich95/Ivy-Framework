using System.IdentityModel.Tokens.Jwt;
using System.Reflection;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Ivy.Hooks;
using Ivy.Shared;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Ivy.Auth.GitHub;

/// <summary>
/// Exception thrown when GitHub OAuth operations fail.
/// </summary>
public class GitHubOAuthException(string? error, string? errorDescription)
    : Exception($"GitHub OAuth error: '{error}' - {errorDescription}")
{
    public string? Error { get; } = error;
    public string? ErrorDescription { get; } = errorDescription;
}

/// <summary>
/// GitHub authentication provider that implements OAuth 2.0 flow for GitHub authentication.
/// </summary>
public class GitHubAuthProvider : IAuthProvider
{
    // Note: Static HttpClient follows the pattern used by other auth providers in this codebase.
    // For multi-tenant scenarios, consider using IHttpClientFactory instead.
    private static readonly HttpClient _httpClient = new()
    {
        DefaultRequestHeaders = { { "User-Agent", "Ivy-Framework" } }
    };

    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly string _redirectUri;
    private readonly List<AuthOption> _authOptions = new();

    /// <summary>
    /// Initializes a new instance of the GitHubAuthProvider with configuration from environment variables and user secrets.
    /// </summary>
    public GitHubAuthProvider()
    {
        var configuration = new ConfigurationBuilder()
            .AddEnvironmentVariables()
            .AddUserSecrets(Assembly.GetEntryAssembly()!)
            .Build();

        _clientId = configuration.GetValue<string>("GitHub:ClientId") ?? throw new InvalidOperationException(
            "Missing required configuration: 'GitHub:ClientId'. Please set this value in your environment variables or user secrets. See the README setup steps for instructions.");
        _clientSecret = configuration.GetValue<string>("GitHub:ClientSecret") ?? throw new InvalidOperationException(
            "Missing required configuration: 'GitHub:ClientSecret'. Please set this value in your environment variables or user secrets. See the README setup steps for instructions.");
        _redirectUri = configuration.GetValue<string>("GitHub:RedirectUri") ?? throw new InvalidOperationException(
            "Missing required configuration: 'GitHub:RedirectUri'. Please set this value in your environment variables or user secrets. See the README setup steps for instructions.");
    }

    /// <summary>
    /// GitHub doesn't support email/password authentication directly.
    /// This method throws a NotSupportedException.
    /// </summary>
    public Task<AuthToken?> LoginAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        throw new NotSupportedException("GitHub authentication only supports OAuth flow. Use GetOAuthUriAsync and HandleOAuthCallbackAsync instead.");
    }

    /// <summary>
    /// Generates a GitHub OAuth authorization URI.
    /// </summary>
    public Task<Uri> GetOAuthUriAsync(AuthOption option, WebhookEndpoint callback, CancellationToken cancellationToken = default)
    {
        var callbackUri = callback.GetUri(includeIdInPath: false);

        var authUrl = new UriBuilder("https://github.com/login/oauth/authorize")
        {
            Query = string.Join("&", new[]
            {
                $"client_id={Uri.EscapeDataString(_clientId)}",
                $"redirect_uri={Uri.EscapeDataString(callbackUri.ToString())}",
                $"scope={Uri.EscapeDataString("user:email")}",
                $"state={Uri.EscapeDataString(callback.Id)}",
                "allow_signup=true"
            })
        };

        return Task.FromResult(authUrl.Uri);
    }

    /// <summary>
    /// Handles the GitHub OAuth callback and exchanges the authorization code for an access token.
    /// </summary>
    public async Task<AuthToken?> HandleOAuthCallbackAsync(HttpRequest request, CancellationToken cancellationToken = default)
    {
        var code = request.Query["code"].ToString();
        var error = request.Query["error"].ToString();
        var errorDescription = request.Query["error_description"].ToString();

        if (!string.IsNullOrEmpty(error) || !string.IsNullOrEmpty(errorDescription))
        {
            throw new GitHubOAuthException(error, errorDescription);
        }

        if (string.IsNullOrEmpty(code))
        {
            var details = $"Received no authorization code from GitHub. " +
                $"Possible causes: user denied access, invalid redirect URI, or other OAuth error. " +
                $"Error: '{error}', Error Description: '{errorDescription}'";
            throw new Exception(details);
        }

        try
        {
            // Exchange authorization code for access token
            var tokenResponse = await ExchangeCodeForTokenAsync(code, cancellationToken);

            if (tokenResponse == null)
            {
                return null;
            }

            return new AuthToken(tokenResponse.AccessToken);
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to exchange authorization code for access token: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// GitHub doesn't support logout via API for OAuth tokens.
    /// This method completes successfully without action.
    /// </summary>
    public Task LogoutAsync(string token, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    /// GitHub OAuth tokens don't have refresh tokens.
    /// This method returns null as GitHub tokens are long-lived.
    /// </summary>
    public Task<AuthToken?> RefreshAccessTokenAsync(AuthToken token, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<AuthToken?>(null);
    }

    /// <summary>
    /// Validates a GitHub access token by making a request to the GitHub API.
    /// </summary>
    public async Task<bool> ValidateAccessTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
            request.Headers.Add("X-GitHub-Api-Version", "2022-11-28");

            var response = await _httpClient.SendAsync(request, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Retrieves user information from GitHub using the access token.
    /// </summary>
    public async Task<UserInfo?> GetUserInfoAsync(string token, CancellationToken cancellationToken = default)
    {
        try
        {
            using var userRequest = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user");
            userRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            userRequest.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
            userRequest.Headers.Add("X-GitHub-Api-Version", "2022-11-28");

            var userResponse = await _httpClient.SendAsync(userRequest, cancellationToken);
            if (!userResponse.IsSuccessStatusCode)
            {
                return null;
            }

            var userJson = await userResponse.Content.ReadAsStringAsync(cancellationToken);
            using var userDoc = JsonDocument.Parse(userJson);
            var user = userDoc.RootElement;

            var userId = user.GetProperty("id").GetInt64().ToString();
            var login = user.GetProperty("login").GetString() ?? "";
            var name = user.TryGetProperty("name", out var nameProp) ? nameProp.GetString() : null;
            var avatarUrl = user.TryGetProperty("avatar_url", out var avatarProp) ? avatarProp.GetString() : null;

            using var emailRequest = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user/emails");
            emailRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            emailRequest.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
            emailRequest.Headers.Add("X-GitHub-Api-Version", "2022-11-28");

            var emailResponse = await _httpClient.SendAsync(emailRequest, cancellationToken);
            string? email = null;

            if (emailResponse.IsSuccessStatusCode)
            {
                var emailJson = await emailResponse.Content.ReadAsStringAsync(cancellationToken);
                using var emailDoc = JsonDocument.Parse(emailJson);
                var emails = emailDoc.RootElement.EnumerateArray();

                // Find primary email first, or first verified email as fallback
                foreach (var emailObj in emails)
                {
                    if (emailObj.TryGetProperty("primary", out var primaryProp) && primaryProp.GetBoolean())
                    {
                        email = emailObj.GetProperty("email").GetString();
                        break;
                    }

                    // If no primary email found yet, check for verified email
                    if (email == null && emailObj.TryGetProperty("verified", out var verifiedProp) && verifiedProp.GetBoolean())
                    {
                        email = emailObj.GetProperty("email").GetString();
                        // Don't break here - continue looking for primary email
                    }
                }
            }

            email ??= login;

            return new UserInfo(userId, email, name, avatarUrl);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Gets the available authentication options for GitHub.
    /// </summary>
    public AuthOption[] GetAuthOptions()
    {
        return _authOptions.ToArray();
    }

    /// <summary>
    /// GitHub OAuth tokens don't have expiration times in the traditional sense.
    /// This method returns null as GitHub tokens are long-lived.
    /// </summary>
    public Task<DateTimeOffset?> GetTokenExpiration(AuthToken token, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<DateTimeOffset?>(null);
    }

    /// <summary>
    /// Adds GitHub OAuth authentication option.
    /// </summary>
    public GitHubAuthProvider UseGitHub()
    {
        _authOptions.Add(new AuthOption(AuthFlow.OAuth, "GitHub", "github", Icons.Github));
        return this;
    }

    private async Task<GitHubTokenResponse?> ExchangeCodeForTokenAsync(string code, CancellationToken cancellationToken)
    {
        using var requestBody = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("client_id", _clientId),
            new KeyValuePair<string, string>("client_secret", _clientSecret),
            new KeyValuePair<string, string>("code", code),
            new KeyValuePair<string, string>("redirect_uri", _redirectUri)
        });

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://github.com/login/oauth/access_token");
        request.Content = requestBody;
        request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        request.Headers.Add("X-GitHub-Api-Version", "2022-11-28");

        var response = await _httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException(
                $"GitHub token exchange failed with status code {(int)response.StatusCode}: {response.ReasonPhrase}. Response: {errorContent}",
                null,
                response.StatusCode
            );
        }

        var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

        // Try to parse as JSON first, fall back to form-encoded
        try
        {
            using var jsonDoc = JsonDocument.Parse(responseContent);
            var root = jsonDoc.RootElement;

            if (root.TryGetProperty("access_token", out var accessTokenProp))
            {
                return new GitHubTokenResponse(accessTokenProp.GetString()!);
            }
        }
        catch (JsonException)
        {
            // Fall back to form-encoded parsing
        }

        // Parse as form-encoded data (fallback)
        var parameters = responseContent.Split('&')
            .Select(p => p.Split('='))
            .Where(p => p.Length == 2)
            .ToDictionary(p => p[0], p => Uri.UnescapeDataString(p[1]));

        if (parameters.TryGetValue("access_token", out var accessToken))
        {
            return new GitHubTokenResponse(accessToken);
        }

        return null;
    }

    private record GitHubTokenResponse(string AccessToken);
}
