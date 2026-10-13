using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MyStreeT.Api.Entities;

namespace MyStreeT.Api.Auth;

public class JwtTokenService : ITokenService
{
    public const string AdminRole = "Admin";
    public const string UserRole = "User";

    private readonly JwtOptions _options;

    public JwtTokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
        if (string.IsNullOrWhiteSpace(_options.Key) || _options.Key.Length < 32)
            throw new InvalidOperationException("Jwt:Key must be at least 32 characters.");
    }

    public TokenResult CreateToken(User user)
    {
        var expires = DateTime.UtcNow.AddMinutes(_options.ExpiryMinutes);
        var claims = new List<Claim>
        {
            new("sub", user.Id.ToString()),
            new("email", user.Email),
            new("role", user.IsAdmin ? AdminRole : UserRole),
            new("jti", Guid.NewGuid().ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new TokenResult(new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
