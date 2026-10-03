namespace MarketDiary.Api.Models;

public sealed class Share
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public DateTime CreatedAt { get; set; }
    public required string UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public ICollection<Note> Notes { get; } = new List<Note>();
}
