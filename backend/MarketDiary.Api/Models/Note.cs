namespace MarketDiary.Api.Models;

public sealed class Note
{
    public int Id { get; set; }
    public int ShareId { get; set; }
    public Share Share { get; set; } = null!;
    public required string Content { get; set; }
    public DateOnly NoteDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
