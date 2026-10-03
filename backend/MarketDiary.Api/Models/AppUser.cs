using Microsoft.AspNetCore.Identity;

namespace MarketDiary.Api.Models;

public sealed class AppUser : IdentityUser
{
    public DateTime CreatedAt { get; set; }
    public ICollection<Share> Shares { get; } = new List<Share>();
}
