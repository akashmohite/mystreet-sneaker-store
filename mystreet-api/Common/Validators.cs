using System.Globalization;
using System.Text.RegularExpressions;

namespace MyStreeT.Api.Common;

public static class Validators
{
    private static readonly Regex EmailRegex =
        new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex SizeRegex =
        new(@"^\d{1,2}(\.5)?$", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex PhoneRegex =
        new(@"^[0-9+\-\s]{7,20}$", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex PostalRegex =
        new(@"^[A-Za-z0-9\- ]{3,10}$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public const string DefaultImage = "/sneakers/placeholder.svg";

    public static string NormalizeEmail(string? email) => (email ?? string.Empty).Trim().ToLowerInvariant();

    public static bool IsValidEmail(string email) => email.Length <= 254 && EmailRegex.IsMatch(email);

    /// <summary>8-100 chars, at least one letter and one digit.</summary>
    public static bool IsStrongPassword(string? password) =>
        !string.IsNullOrEmpty(password)
        && password.Length is >= 8 and <= 100
        && password.Any(char.IsLetter)
        && password.Any(char.IsDigit);

    public static bool IsValidPhone(string value) => PhoneRegex.IsMatch(value);
    public static bool IsValidPostalCode(string value) => PostalRegex.IsMatch(value);

    public static bool IsValidSize(string size) =>
        SizeRegex.IsMatch(size)
        && decimal.TryParse(size, NumberStyles.Number, CultureInfo.InvariantCulture, out var v)
        && v is >= 3 and <= 18;

    /// <summary>Validates and normalises a CSV of sizes ("9, 8,10" -> "8,9,10"). Throws on invalid input.</summary>
    public static string NormalizeSizes(string? csv)
    {
        var parts = (csv ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct()
            .ToList();

        if (parts.Count == 0)
            throw new RequestValidationException("At least one size is required (e.g. 7,8,9,10)");

        var bad = parts.FirstOrDefault(p => !IsValidSize(p));
        if (bad is not null)
            throw new RequestValidationException($"'{bad}' is not a valid size. Use numbers between 3 and 18, e.g. 7,8,9.5");

        return string.Join(',', parts.OrderBy(p => decimal.Parse(p, CultureInfo.InvariantCulture)));
    }

    public static string NormalizeImageUrl(string? url)
    {
        var value = (url ?? string.Empty).Trim();
        if (value.Length == 0) return DefaultImage;
        if (value.Length > 500) throw new RequestValidationException("Image URL must be 500 characters or fewer");

        var relative = value.StartsWith('/') && !value.StartsWith("//");
        var absolute = Uri.TryCreate(value, UriKind.Absolute, out var uri)
                       && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
        if (!relative && !absolute)
            throw new RequestValidationException("Image URL must be an http(s) link or a path starting with '/'");
        return value;
    }
}
