using FluentAssertions;
using Moq;
using MyStreeT.Api.Auth;
using MyStreeT.Api.Common;
using MyStreeT.Api.DTOs;
using MyStreeT.Api.Services;

namespace MyStreeT.Tests;

public class AuthServiceTests
{
    private readonly Mock<IPasswordHasher> _hasher = new();
    private readonly Mock<ITokenService> _tokens = new();

    public AuthServiceTests()
    {
        _hasher.Setup(h => h.Hash(It.IsAny<string>())).Returns<string>(p => "HASH(" + p + ")");
        _hasher.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<string>()))
            .Returns<string, string>((p, h) => h == "HASH(" + p + ")");
        _tokens.Setup(t => t.CreateToken(It.IsAny<MyStreeT.Api.Entities.User>()))
            .Returns(new TokenResult("jwt-token", DateTime.UtcNow.AddHours(1)));
    }

    private AuthService Create(out MyStreeT.Api.Data.AppDbContext db)
    {
        db = TestHelpers.NewDb();
        return new AuthService(db, _hasher.Object, _tokens.Object, TestHelpers.Log<AuthService>());
    }

    [Fact]
    public async Task Register_creates_non_admin_user_with_hashed_password_and_returns_token()
    {
        var sut = Create(out var db);

        var result = await sut.RegisterAsync(new RegisterRequest { Email = "  New@Test.com ", Password = "Password123" });

        result.Token.Should().Be("jwt-token");
        result.IsAdmin.Should().BeFalse();
        result.Email.Should().Be("new@test.com");
        var user = db.Users.Single();
        user.PasswordHash.Should().NotBe("Password123").And.Be("HASH(Password123)");
        user.IsAdmin.Should().BeFalse();
        _hasher.Verify(h => h.Hash("Password123"), Times.Once);
    }

    [Fact]
    public async Task Register_rejects_duplicate_email_case_insensitively()
    {
        var sut = Create(out _);
        await sut.RegisterAsync(new RegisterRequest { Email = "dup@test.com", Password = "Password123" });

        var act = () => sut.RegisterAsync(new RegisterRequest { Email = "DUP@test.com", Password = "Password123" });

        await act.Should().ThrowAsync<ConflictException>();
    }

    [Theory]
    [InlineData("", "Password123")]
    [InlineData("bad-email", "Password123")]
    [InlineData("a@b.com", "short")]
    [InlineData("a@b.com", "nodigitshere")]
    public async Task Register_rejects_invalid_input(string email, string password)
    {
        var sut = Create(out var db);

        var act = () => sut.RegisterAsync(new RegisterRequest { Email = email, Password = password });

        await act.Should().ThrowAsync<RequestValidationException>();
        db.Users.Should().BeEmpty();
    }

    [Fact]
    public async Task Login_succeeds_with_correct_credentials()
    {
        var sut = Create(out _);
        await sut.RegisterAsync(new RegisterRequest { Email = "a@test.com", Password = "Password123" });

        var result = await sut.LoginAsync(new LoginRequest { Email = "A@test.com", Password = "Password123" });

        result.Token.Should().Be("jwt-token");
        result.Email.Should().Be("a@test.com");
    }

    [Fact]
    public async Task Login_fails_with_wrong_password()
    {
        var sut = Create(out _);
        await sut.RegisterAsync(new RegisterRequest { Email = "a@test.com", Password = "Password123" });

        var act = () => sut.LoginAsync(new LoginRequest { Email = "a@test.com", Password = "Wrong12345" });

        await act.Should().ThrowAsync<UnauthorizedAppException>().WithMessage("Invalid email or password");
    }

    [Fact]
    public async Task Login_unknown_user_gives_same_message_as_wrong_password()
    {
        var sut = Create(out _);

        var act = () => sut.LoginAsync(new LoginRequest { Email = "nobody@test.com", Password = "Password123" });

        await act.Should().ThrowAsync<UnauthorizedAppException>().WithMessage("Invalid email or password");
    }

    [Fact]
    public async Task Login_requires_email_and_password()
    {
        var sut = Create(out _);

        var act = () => sut.LoginAsync(new LoginRequest { Email = "", Password = "" });

        await act.Should().ThrowAsync<RequestValidationException>();
    }

    [Fact]
    public async Task Login_as_seeded_admin_returns_admin_flag()
    {
        var sut = Create(out var db);
        var admin = TestHelpers.NewUser("admin@test.com", admin: true);
        admin.PasswordHash = "HASH(Admin@12345)";
        db.Users.Add(admin);
        await db.SaveChangesAsync();

        var result = await sut.LoginAsync(new LoginRequest { Email = "admin@test.com", Password = "Admin@12345" });

        result.IsAdmin.Should().BeTrue();
    }
}
