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
[Route("api/shares")]
public sealed class SharesController(AppDbContext database) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ShareResponse>>> List([FromQuery] string? search)
    {
        var userId = LocalUser.Id /* AUTH-DISABLED: User.FindFirstValue(ClaimTypes.NameIdentifier)! */;
        var shares = database.Shares.AsNoTracking().Where(share => share.UserId == userId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var query = search.Trim();
            var pattern = "%" + query.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
            shares = shares.Where(share => EF.Functions.Like(share.Name, pattern, "\\"));
        }

        var result = await shares
            .OrderBy(share => share.Name)
            .Select(share => new ShareResponse(share.Id, share.Name, share.CreatedAt))
            .Take(100)
            .ToListAsync();
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ShareResponse>> Create(CreateShareRequest request)
    {
        var name = request.Name.Trim();
        if (name.Length == 0)
        {
            ModelState.AddModelError(nameof(request.Name), "Share name is required.");
            return ValidationProblem(ModelState);
        }

        var share = new Share
        {
            Name = name,
            UserId = LocalUser.Id /* AUTH-DISABLED: User.FindFirstValue(ClaimTypes.NameIdentifier)! */,
            CreatedAt = DateTime.UtcNow
        };
        database.Shares.Add(share);
        await database.SaveChangesAsync();
        var response = new ShareResponse(share.Id, share.Name, share.CreatedAt);
        return Created("/api/shares", response);
    }

    [HttpDelete("{shareId:int}")]
    public async Task<IActionResult> Delete(int shareId)
    {
        var userId = LocalUser.Id /* AUTH-DISABLED: User.FindFirstValue(ClaimTypes.NameIdentifier)! */;
        var share = await database.Shares
            .SingleOrDefaultAsync(item => item.Id == shareId && item.UserId == userId);
        if (share is null)
        {
            return NotFound();
        }

        database.Shares.Remove(share);
        await database.SaveChangesAsync();
        return NoContent();
    }
}
