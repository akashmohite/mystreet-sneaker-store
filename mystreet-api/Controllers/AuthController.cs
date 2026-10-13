using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyStreeT.Api.DTOs;
using MyStreeT.Api.Services;

namespace MyStreeT.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Register(RegisterRequest request)
        => StatusCode(StatusCodes.Status201Created, await _auth.RegisterAsync(request));

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Login(LoginRequest request)
        => Ok(await _auth.LoginAsync(request));

    /// <summary>
    /// JWTs are stateless, so logout is completed client-side by discarding the token.
    /// The endpoint exists to validate the token and give clients a single logout contract.
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout() => NoContent();
}
