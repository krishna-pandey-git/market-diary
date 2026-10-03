using System.ComponentModel.DataAnnotations;

namespace MarketDiary.Api.Contracts;

public sealed record CreateShareRequest(
    [Required, StringLength(120, MinimumLength = 1)]
    string Name);

public sealed record ShareResponse(int Id, string Name, DateTime CreatedAt);
