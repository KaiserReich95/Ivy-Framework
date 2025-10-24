namespace Ivy.Abstractions.Auth;

/// <summary>
/// Represents a webhook endpoint for authentication callbacks.
/// </summary>
/// <param name="Id">Unique identifier for the webhook</param>
/// <param name="BaseUrl">Base URL for the webhook endpoint</param>
public record WebhookEndpoint(string Id, string BaseUrl);
