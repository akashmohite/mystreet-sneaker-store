namespace MyStreeT.Api.Auth;

public class JwtOptions
{
    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = "MyStreeT";
    public string Audience { get; set; } = "MyStreeT.Client";
    public int ExpiryMinutes { get; set; } = 120;
}
