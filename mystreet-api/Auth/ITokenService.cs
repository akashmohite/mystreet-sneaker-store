using MyStreeT.Api.Entities;

namespace MyStreeT.Api.Auth;

public record TokenResult(string Token, DateTime ExpiresAt);

public interface ITokenService
{
    TokenResult CreateToken(User user);
}
