using System.Security.Claims;
using CatalagoApi.Models.DTOs;
using CatalagoApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;

namespace CatalagoApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly IWebHostEnvironment _env;

    public AuthController(AuthService authService, IWebHostEnvironment env)
    {
        _authService = authService;
        _env = env;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        var result = await _authService.LoginAsync(request, ct);
        if (result == null)
            return Unauthorized(new { message = "Email ou senha inválidos" });
        return Ok(result);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        var result = await _authService.RefreshAsync(request, ct);
        if (result == null)
            return Unauthorized(new { message = "Refresh token inválido ou expirado" });
        return Ok(result);
    }

    [HttpPost("alterar-senha")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AlterarSenha([FromBody] AlterarSenhaRequest request, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null || !int.TryParse(userId, out var id))
            return Unauthorized();
        var ok = await _authService.AlterarSenhaAsync(id, request, ct);
        if (!ok)
            return BadRequest(new { message = "Senha atual incorreta" });
        return NoContent();
    }

    [HttpPost("recuperar-senha")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> RecuperarSenha([FromBody] RecuperarSenhaRequest request, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        var token = await _authService.RecuperarSenhaAsync(request, ct);
        // Sempre retornar 200 para não revelar se o email existe. Em dev retorna o token para testes.
        var payload = new Dictionary<string, object?> { ["message"] = "Se o email existir, você receberá instruções." };
        if (_env.IsDevelopment() && token != null)
            payload["token"] = token;
        return Ok(payload);
    }

    [HttpPost("redefinir-senha")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RedefinirSenha([FromBody] RedefinirSenhaRequest request, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        var ok = await _authService.RedefinirSenhaAsync(request, ct);
        if (!ok)
            return BadRequest(new { message = "Token inválido ou expirado. Solicite uma nova recuperação de senha." });
        return NoContent();
    }
}
