using MarketDiary.Api.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace MarketDiary.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser>(options)
{
    public DbSet<Share> Shares => Set<Share>();
    public DbSet<Note> Notes => Set<Note>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Share>(entity =>
        {
            entity.Property(share => share.Name).HasMaxLength(120).IsRequired();
            entity.HasIndex(share => new { share.UserId, share.Name });
            entity.HasOne(share => share.User)
                .WithMany(user => user.Shares)
                .HasForeignKey(share => share.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Note>(entity =>
        {
            entity.Property(note => note.Content).HasMaxLength(10000).IsRequired();
            entity.HasIndex(note => new { note.ShareId, note.NoteDate });
            entity.HasOne(note => note.Share)
                .WithMany(share => share.Notes)
                .HasForeignKey(note => note.ShareId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
