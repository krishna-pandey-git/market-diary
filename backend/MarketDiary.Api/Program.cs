using System.Text;
using System.Net;
using System.Threading.RateLimiting;
using MarketDiary.Api.Data;
using MarketDiary.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Set the ConnectionStrings__Default setting, for example 'Data Source=App_Data/market-diary.db'.");
var databasePath = new SqliteConnectionStringBuilder(connectionString).DataSource;
if (Path.GetDirectoryName(Path.GetFullPath(databasePath)) is { } databaseDirectory)
{
    Directory.CreateDirectory(databaseDirectory);
}
// AUTH-DISABLED: JWT configuration
// var signingKey = builder.Configuration["Authentication:JwtSigningKey"]
//     ?? throw new InvalidOperationException("Set the Authentication__JwtSigningKey environment variable.");
// if (Encoding.UTF8.GetByteCount(signingKey) < 32)
// {
//     throw new InvalidOperationException("Authentication__JwtSigningKey must be at least 32 bytes long.");
// }
// 
// var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));
// var issuer = builder.Configuration["Authentication:Issuer"] ?? "MarketDiary";
// var audience = builder.Configuration["Authentication:Audience"] ?? "MarketDiary.Client";

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));
builder.Services
    .AddIdentityCore<AppUser>(options =>
    {
        options.User.RequireUniqueEmail = false;
        options.Password.RequiredLength = 12;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
        options.Lockout.AllowedForNewUsers = true;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager();

// AUTH-DISABLED: builder.Services
// AUTH-DISABLED:     .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
// AUTH-DISABLED:     .AddJwtBearer(options =>
// AUTH-DISABLED:     {
// AUTH-DISABLED:         options.TokenValidationParameters = new TokenValidationParameters
// AUTH-DISABLED:         {
// AUTH-DISABLED:             ValidateIssuer = true,
// AUTH-DISABLED:             ValidIssuer = issuer,
// AUTH-DISABLED:             ValidateAudience = true,
// AUTH-DISABLED:             ValidAudience = audience,
// AUTH-DISABLED:             ValidateIssuerSigningKey = true,
// AUTH-DISABLED:             IssuerSigningKey = key,
// AUTH-DISABLED:             ValidateLifetime = true,
// AUTH-DISABLED:             ClockSkew = TimeSpan.FromSeconds(30)
// AUTH-DISABLED:         };
// AUTH-DISABLED:     });
// AUTH-DISABLED: builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // The host (e.g. Azure App Service) fronts the app with its own proxy, so trust it.
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
        }
    });
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseForwardedHeaders();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

await using (var scope = app.Services.CreateAsyncScope())
{
    var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await database.Database.MigrateAsync();
    // WAL lets reads proceed during writes and persists in the database file.
    await database.Database.ExecuteSqlRawAsync("PRAGMA journal_mode=WAL;");

    // AUTH-DISABLED: shares need an owner, so a single stand-in user owns everything.
    if (!await database.Users.AnyAsync(user => user.Id == LocalUser.Id))
    {
        database.Users.Add(new AppUser
        {
            Id = LocalUser.Id,
            UserName = LocalUser.UserName,
            NormalizedUserName = LocalUser.UserName.ToUpperInvariant(),
            SecurityStamp = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow
        });
        await database.SaveChangesAsync();
    }
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseRouting();
app.UseCors();
app.UseRateLimiter();
// AUTH-DISABLED: app.UseAuthentication();
// AUTH-DISABLED: app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
// Serves the Angular app (published into wwwroot); unknown non-API paths fall back to index.html.
app.MapFallbackToFile("{*path:regex(^(?!api/).*$)}", "index.html");

app.Run();