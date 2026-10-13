using System.IdentityModel.Tokens.Jwt;
using FluentAssertions;
using Microsoft.Extensions.Options;
using MyStreeT.Api.Auth;

namespace MyStreeT.Tests;

public class JwtTokenServiceTests
{
    private static JwtTokenService Create(string key = "this-is-a-test-key-with-at-least-32-chars!!")
        => new(Options.Create(new JwtOptions { Key = key, Issuer = "iss", Audience = "aud", ExpiryMinutes = 30 }));

    [Fact]
    public void CreateToken_contains_subject_email_and_user_role_for_normal_user()
    {
        var user = TestHelpers.NewUser("u@test.com");

        var result = Create().CreateToken(user);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(result.Token);
        jwt.Claims.First(c => c.Type == "sub").Value.Should().Be(user.Id.ToString());
        jwt.Claims.First(c => c.Type == "email").Value.Should().Be("u@test.com");
        jwt.Claims.First(c => c.Type == "role").Value.Should().Be("User");
        jwt.Issuer.Should().Be("iss");
        result.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public void CreateToken_uses_admin_role_for_admin_user()
    {
        var result = Create().CreateToken(TestHelpers.NewUser("a@test.com", admin: true));

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(result.Token);
        jwt.Claims.First(c => c.Type == "role").Value.Should().Be("Admin");
    }

    [Fact]
    public void Constructor_rejects_short_key()
    {
        var act = () => Create("too-short");
        act.Should().Throw<InvalidOperationException>();
    }
}
