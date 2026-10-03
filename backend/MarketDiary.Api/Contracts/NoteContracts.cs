using System.ComponentModel.DataAnnotations;

namespace MarketDiary.Api.Contracts;

public sealed record SaveNoteRequest(
    [Required, StringLength(10000, MinimumLength = 1)]
    string Content,
    DateOnly? NoteDate);

public sealed record NoteResponse(
    int Id,
    int ShareId,
    string Content,
    DateOnly NoteDate,
    DateTime CreatedAt,
    DateTime UpdatedAt);
