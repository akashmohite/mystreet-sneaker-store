using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MyStreeT.Api.Auth;
using MyStreeT.Api.Common;
using MyStreeT.Api.Data;
using MyStreeT.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ---------- Configuration ----------
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured.");

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrWhiteSpace(jwt.Key))
{
    if (builder.Environment.IsDevelopment())
    {
        // No secret is ever committed: in Development an ephemeral key is generated per run.
        // (Sessions end when the API restarts. Set Jwt__Key / user-secrets to keep them.)
        jwt.Key = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        Console.WriteLine("[MyStreeT] Jwt:Key not configured - generated an ephemeral development key.");
    }
    else
    {
        throw new InvalidOperationException("Jwt:Key must be configured (environment variable Jwt__Key or a secret store).");
    }
}
if (jwt.Key.Length < 32) throw new InvalidOperationException("Jwt:Key must be at least 32 characters.");

// ---------- Services ----------
var dbProvider = builder.Configuration.GetValue("Database:Provider", "SqlServer");
builder.Services.AddDbContext<AppDbContext>(o =>
{
    if (string.Equals(dbProvider, "Sqlite", StringComparison.OrdinalIgnoreCase))
        o.UseSqlite(connectionString);
    else
        o.UseSqlServer(connectionString);
});
builder.Services.AddSingleton<IOptions<JwtOptions>>(Options.Create(jwt));
builder.Services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IOrderService, OrderService>();

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(o =>
    {
        // Model-binding / DataAnnotations failures use the same structured error body.
        o.InvalidModelStateResponseFactory = ctx =>
        {
            var message = ctx.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage) ? "The request is invalid" : e.ErrorMessage)
                .FirstOrDefault() ?? "The request is invalid";
            var body = new ErrorResponse(DateTime.UtcNow, ctx.HttpContext.Request.Path.Value ?? "", "VALIDATION_ERROR", message);
            return new BadRequestObjectResult(body);
        };
    });

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = "sub",
            RoleClaimType = "role"
        };
        o.Events = new JwtBearerEvents
        {
            OnChallenge = async ctx =>
            {
                ctx.HandleResponse();
                await ErrorWriter.WriteAsync(ctx.HttpContext, StatusCodes.Status401Unauthorized,
                    "UNAUTHORIZED", "Please sign in to continue");
            },
            OnForbidden = ctx => ErrorWriter.WriteAsync(ctx.HttpContext, StatusCodes.Status403Forbidden,
                "FORBIDDEN", "You do not have permission to perform this action")
        };
    });
builder.Services.AddAuthorization();

var allowedOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "MyStreeT API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste the JWT returned by /api/auth/login"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// ---------- Database setup ----------
if (builder.Configuration.GetValue("Database:InitOnStartup", false))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.GetMigrations().Any())
        await db.Database.MigrateAsync();
    else
        await db.Database.EnsureCreatedAsync(); // fallback when no migration has been generated yet

    if (builder.Configuration.GetValue("Seed:Enabled", false))
    {
        await DbSeeder.SeedAsync(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher>(),
            builder.Configuration, app.Logger);
    }
}

// ---------- Pipeline ----------
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Unmatched routes also use the structured error body.
app.MapControllers();
app.MapFallback(ctx => ErrorWriter.WriteAsync(ctx, StatusCodes.Status404NotFound, "NOT_FOUND", "Resource not found"));

app.Run();

public partial class Program { }
