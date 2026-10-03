using System.ComponentModel.DataAnnotations;

namespace MarketDiary.Api.Contracts;

public sealed record RegisterRequest(
    [Required, StringLength(32, MinimumLength = 3), RegularExpression("^[a-zA-Z0-9._-]+$")]
    string UserName,
    [Required, StringLength(128, MinimumLength = 12)]
    string Password);

public sealed record LoginRequest(
    [Required, StringLength(32)]
    string UserName,
    [Required, StringLength(128)]
    string Password);

public sealed record AuthResponse(string AccessToken, DateTime ExpiresAtUtc, string UserName);
