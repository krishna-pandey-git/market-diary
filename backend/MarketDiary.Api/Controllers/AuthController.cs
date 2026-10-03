using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MarketDiary.Api.Contracts;
using MarketDiary.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;

namespace MarketDiary.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    UserManager<AppUser> userManager,
    SignInManager<AppUser> signInManager,
    IConfiguration configuration) : ControllerBase
{
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromHours(1);

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var userName = request.UserName.Trim();
        var user = new AppUser
        {
            UserName = userName,
            LockoutEnabled = true,
            CreatedAt = DateTime.UtcNow
        };
        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = result.Errors
                .GroupBy(error => error.Code)
                .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray());
            return ValidationProblem(new ValidationProblemDetails(errors));
        }

        return Ok(CreateToken(user));
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await userManager.FindByNameAsync(request.UserName.Trim());
        if (user is null)
        {
            return Unauthorized(new ProblemDetails { Title = "Invalid username or password." });
        }

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
        {
            return Unauthorized(new ProblemDetails { Title = "Invalid username or password." });
        }

        return Ok(CreateToken(user));
    }

    private AuthResponse CreateToken(AppUser user)
    {
        var signingKey = configuration["Authentication:JwtSigningKey"]
            ?? throw new InvalidOperationException("Authentication:JwtSigningKey is not configured.");
        var issuer = configuration["Authentication:Issuer"] ?? "MarketDiary";
        var audience = configuration["Authentication:Audience"] ?? "MarketDiary.Client";
        var expiresAt = DateTime.UtcNow.Add(TokenLifetime);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Name, user.UserName ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return new AuthResponse(new JwtSecurityTokenHandler().WriteToken(token), expiresAt, user.UserName ?? string.Empty);
    }
}
