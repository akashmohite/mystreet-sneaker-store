using System.ComponentModel.DataAnnotations;

namespace MyStreeT.Api.DTOs;

public class RegisterRequest
{
    [Required(ErrorMessage = "Email is required")]
    [MaxLength(254, ErrorMessage = "Email is too long")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required")]
    [MaxLength(100, ErrorMessage = "Password is too long")]
    public string Password { get; set; } = string.Empty;
}

public class LoginRequest
{
    [Required(ErrorMessage = "Email is required")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required")]
    public string Password { get; set; } = string.Empty;
}

public record AuthResponse(string Token, string Email, bool IsAdmin, DateTime ExpiresAt);
