# Ivy.Auth.Clerk

An Ivy authentication provider for Clerk.

## Configuration

The configuration settings are read from environment variables or user secrets:

```csharp
var authProvider = new ClerkAuthProvider()
    .UseEmailPassword()
    .UseGoogle()
    .UseGithub();

server.UseAuth(authProvider);
```

## Configuration Keys

- `Clerk:SecretKey` - Your Clerk secret key
- `Clerk:PublishableKey` - Your Clerk publishable key
- `Clerk:JwtKey` - Your Clerk JWT signing key (optional)

## Supported OAuth Providers

- Google
- GitHub
- Twitter
- Apple
- Microsoft

## Usage in Ivy Applications

```csharp
using Ivy.Auth.Clerk;

var server = new Server();

server.UseAuth(new ClerkAuthProvider()
    .UseEmailPassword()
    .UseGoogle()
    .UseGithub());

await server.RunAsync();
```