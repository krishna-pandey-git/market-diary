using System.Security.Claims;
using MarketDiary.Api.Contracts;
using MarketDiary.Api.Data;
using MarketDiary.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MarketDiary.Api.Controllers;

[ApiController]
// AUTH-DISABLED: [Authorize]
[Route("api/shares/{shareId:int}/notes")]
public sealed class NotesController(AppDbContext database) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NoteResponse>>> List(int shareId)
    {
        if (!await OwnsShare(shareId))
        {
            return NotFound();
        }

        var notes = await database.Notes.AsNoTracking()
            .Where(note => note.ShareId == shareId)
            .OrderByDescending(note => note.NoteDate)
            .ThenByDescending(note => note.CreatedAt)
            .Select(note => ToResponse(note))
            .ToListAsync();
        return Ok(notes);
    }

    [HttpPost]
    public async Task<ActionResult<NoteResponse>> Create(int shareId, SaveNoteRequest request)
    {
        if (!await OwnsShare(shareId))
        {
            return NotFound();
        }

        var content = request.Content.Trim();
        if (content.Length == 0)
        {
            ModelState.AddModelError(nameof(request.Content), "Note content is required.");
            return ValidationProblem(ModelState);
        }

        var now = DateTime.UtcNow;
        var note = new Note
        {
            ShareId = shareId,
            Content = content,
            NoteDate = request.NoteDate ?? DateOnly.FromDateTime(now),
            CreatedAt = now,
            UpdatedAt = now
        };
        database.Notes.Add(note);
        await database.SaveChangesAsync();
        var response = ToResponse(note);
        return CreatedAtAction(nameof(List), new { shareId }, response);
    }

    [HttpPut("{noteId:int}")]
    public async Task<ActionResult<NoteResponse>> Update(int shareId, int noteId, SaveNoteRequest request)
    {
        var userId = LocalUser.Id /* AUTH-DISABLED: User.FindFirstValue(ClaimTypes.NameIdentifier)! */;
        var note = await database.Notes
            .Include(item => item.Share)
            .SingleOrDefaultAsync(item =>
                item.Id == noteId &&
                item.ShareId == shareId &&
                item.Share.UserId == userId);
        if (note is null)
        {
            return NotFound();
        }

        var content = request.Content.Trim();
        if (content.Length == 0)
        {
            ModelState.AddModelError(nameof(request.Content), "Note content is required.");
            return ValidationProblem(ModelState);
        }

        note.Content = content;
        note.NoteDate = request.NoteDate ?? note.NoteDate;
        note.UpdatedAt = DateTime.UtcNow;
        await database.SaveChangesAsync();
        return Ok(ToResponse(note));
    }

    [HttpDelete("{noteId:int}")]
    public async Task<IActionResult> Delete(int shareId, int noteId)
    {
        var userId = LocalUser.Id /* AUTH-DISABLED: User.FindFirstValue(ClaimTypes.NameIdentifier)! */;
        var note = await database.Notes
            .Include(item => item.Share)
            .SingleOrDefaultAsync(item =>
                item.Id == noteId &&
                item.ShareId == shareId &&
                item.Share.UserId == userId);
        if (note is null)
        {
            return NotFound();
        }

        database.Notes.Remove(note);
        await database.SaveChangesAsync();
        return NoContent();
    }

    private async Task<bool> OwnsShare(int shareId)
    {
        var userId = LocalUser.Id /* AUTH-DISABLED: User.FindFirstValue(ClaimTypes.NameIdentifier)! */;
        return await database.Shares.AnyAsync(share => share.Id == shareId && share.UserId == userId);
    }

    private static NoteResponse ToResponse(Note note) =>
        new(note.Id, note.ShareId, note.Content, note.NoteDate, note.CreatedAt, note.UpdatedAt);
}
