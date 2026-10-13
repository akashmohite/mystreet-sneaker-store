using Microsoft.EntityFrameworkCore;
using MyStreeT.Api.Auth;
using MyStreeT.Api.Common;
using MyStreeT.Api.Data;
using MyStreeT.Api.DTOs;
using MyStreeT.Api.Entities;

namespace MyStreeT.Api.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly ITokenService _tokens;
    private readonly ILogger<AuthService> _logger;

    public AuthService(AppDbContext db, IPasswordHasher hasher, ITokenService tokens, ILogger<AuthService> logger)
    {
        _db = db;
        _hasher = hasher;
        _tokens = tokens;
        _logger = logger;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var email = Validators.NormalizeEmail(request?.Email);
        if (email.Length == 0) throw new RequestValidationException("Email is required");
        if (!Validators.IsValidEmail(email)) throw new RequestValidationException("Please enter a valid email address");
        if (!Validators.IsStrongPassword(request!.Password))
            throw new RequestValidationException("Password must be 8-100 characters and include at least one letter and one number");

        if (await _db.Users.AnyAsync(u => u.Email == email))
            throw new ConflictException("An account with this email already exists");

        // Public registration can never create an admin.
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = _hasher.Hash(request.Password),
            IsAdmin = false
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        _logger.LogInformation("User registered: {UserId}", user.Id);
        return ToResponse(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var email = Validators.NormalizeEmail(request?.Email);
        if (email.Length == 0 || string.IsNullOrEmpty(request?.Password))
            throw new RequestValidationException("Email and password are required");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null || !_hasher.Verify(request.Password, user.PasswordHash))
        {
            _logger.LogInformation("Failed login attempt");
            // Same message for unknown user and wrong password (no account enumeration).
            throw new UnauthorizedAppException("Invalid email or password");
        }

        return ToResponse(user);
    }

    private AuthResponse ToResponse(User user)
    {
        var token = _tokens.CreateToken(user);
        return new AuthResponse(token.Token, user.Email, user.IsAdmin, token.ExpiresAt);
    }
}
