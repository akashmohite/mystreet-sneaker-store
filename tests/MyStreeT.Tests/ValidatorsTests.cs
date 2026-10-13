using FluentAssertions;
using MyStreeT.Api.Common;

namespace MyStreeT.Tests;

public class ValidatorsTests
{
    [Theory]
    [InlineData("a@b.com", true)]
    [InlineData("user.name@mail.example.org", true)]
    [InlineData("not-an-email", false)]
    [InlineData("a@b", false)]
    [InlineData("a b@c.com", false)]
    public void IsValidEmail_checks_format(string email, bool expected)
        => Validators.IsValidEmail(email).Should().Be(expected);

    [Theory]
    [InlineData("Password123", true)]
    [InlineData("short1", false)]
    [InlineData("alllettersonly", false)]
    [InlineData("12345678", false)]
    [InlineData("", false)]
    public void IsStrongPassword_requires_length_letter_and_digit(string password, bool expected)
        => Validators.IsStrongPassword(password).Should().Be(expected);

    [Fact]
    public void NormalizeSizes_sorts_numerically_and_removes_duplicates()
        => Validators.NormalizeSizes("10, 8,9,8,7.5").Should().Be("7.5,8,9,10");

    [Theory]
    [InlineData("")]
    [InlineData("abc")]
    [InlineData("2")]
    [InlineData("19")]
    [InlineData("9.3")]
    public void NormalizeSizes_rejects_invalid(string csv)
    {
        var act = () => Validators.NormalizeSizes(csv);
        act.Should().Throw<RequestValidationException>();
    }

    [Theory]
    [InlineData(null, Validators.DefaultImage)]
    [InlineData("  ", Validators.DefaultImage)]
    [InlineData("/sneakers/a.svg", "/sneakers/a.svg")]
    [InlineData("https://img.example.com/a.png", "https://img.example.com/a.png")]
    public void NormalizeImageUrl_accepts_valid_or_defaults(string? input, string expected)
        => Validators.NormalizeImageUrl(input).Should().Be(expected);

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("//evil.com/x.png")]
    [InlineData("ftp://x.com/a.png")]
    [InlineData("just text")]
    public void NormalizeImageUrl_rejects_unsafe_values(string input)
    {
        var act = () => Validators.NormalizeImageUrl(input);
        act.Should().Throw<RequestValidationException>();
    }

    [Theory]
    [InlineData("+91 98765-43210", true)]
    [InlineData("12", false)]
    [InlineData("abc1234567", false)]
    public void IsValidPhone_checks_format(string phone, bool expected)
        => Validators.IsValidPhone(phone).Should().Be(expected);
}
