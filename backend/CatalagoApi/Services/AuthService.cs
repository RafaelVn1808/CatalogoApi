using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using CatalagoApi.Data;
using CatalagoApi.Models;
using CatalagoApi.Models.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace CatalagoApi.Services;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly JwtSettings _jwtSettings;

    public AuthService(AppDbContext db, IOptions<JwtSettings> jwtSettings)
    {
        _db = db;
        _jwtSettings = jwtSettings.Value;
    }

    /// <summary>Login retorna access token + refresh token.</summary>
    public async Task<TokenResponse?> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var usuario = await _db.Usuarios
            .Include(u => u.Loja)
            .FirstOrDefaultAsync(u => u.Email == request.Email, ct);

        if (usuario == null)
            return null;

        if (!BCrypt.Net.BCrypt.Verify(request.Senha, usuario.SenhaHash))
            return null;

        var accessToken = GerarAccessToken(usuario);
        var (refreshToken, expiresAt) = await GerarRefreshTokenAsync(usuario.Id, ct);
        var accessExpires = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationMinutes);

        return new TokenResponse(
            accessToken,
            refreshToken,
            accessExpires,
            usuario.Nome,
            usuario.Email,
            usuario.Role,
            usuario.LojaId
        );
    }

    /// <summary>Renova o access token usando um refresh token válido.</summary>
    public async Task<TokenResponse?> RefreshAsync(RefreshTokenRequest request, CancellationToken ct = default)
    {
        var tokenEntity = await _db.RefreshTokens
            .Include(rt => rt.Usuario).ThenInclude(u => u!.Loja)
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken && rt.ExpiresAt > DateTime.UtcNow, ct);

        if (tokenEntity?.Usuario == null)
            return null;

        _db.RefreshTokens.Remove(tokenEntity);
        await _db.SaveChangesAsync(ct);

        var usuario = tokenEntity.Usuario;
        var accessToken = GerarAccessToken(usuario);
        var (refreshToken, _) = await GerarRefreshTokenAsync(usuario.Id, ct);
        var accessExpires = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationMinutes);

        return new TokenResponse(
            accessToken,
            refreshToken,
            accessExpires,
            usuario.Nome,
            usuario.Email,
            usuario.Role,
            usuario.LojaId
        );
    }

    /// <summary>Altera a senha do usuário autenticado.</summary>
    /// <returns>True se a senha atual estiver correta e a senha foi alterada.</returns>
    public async Task<bool> AlterarSenhaAsync(int usuarioId, AlterarSenhaRequest request, CancellationToken ct = default)
    {
        var usuario = await _db.Usuarios.FindAsync([usuarioId], ct);
        if (usuario == null)
            return false;
        if (!BCrypt.Net.BCrypt.Verify(request.SenhaAtual, usuario.SenhaHash))
            return false;

        usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(request.NovaSenha);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>Gera token de redefinição e armazena no usuário. Em produção, enviar por email.</summary>
    /// <returns>Token gerado (em dev pode ser retornado; em prod enviar por email).</returns>
    public async Task<string?> RecuperarSenhaAsync(RecuperarSenhaRequest request, CancellationToken ct = default)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == request.Email, ct);
        if (usuario == null)
            return null; // Não revelar se o email existe

        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        usuario.TokenRedefinicao = BCrypt.Net.BCrypt.HashPassword(token);
        usuario.TokenRedefinicaoExpira = DateTime.UtcNow.AddHours(24);
        await _db.SaveChangesAsync(ct);

        // Em produção: IEmailSender.SendAsync(...). Em dev retornamos o token para testes.
        return token;
    }

    /// <summary>Redefine a senha usando o token recebido por email.</summary>
    public async Task<bool> RedefinirSenhaAsync(RedefinirSenhaRequest request, CancellationToken ct = default)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == request.Email, ct);
        if (usuario == null || usuario.TokenRedefinicao == null || usuario.TokenRedefinicaoExpira == null)
            return false;
        if (usuario.TokenRedefinicaoExpira < DateTime.UtcNow)
            return false;
        if (!BCrypt.Net.BCrypt.Verify(request.Token, usuario.TokenRedefinicao))
            return false;

        usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(request.NovaSenha);
        usuario.TokenRedefinicao = null;
        usuario.TokenRedefinicaoExpira = null;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private string GerarAccessToken(Usuario usuario)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new(ClaimTypes.Email, usuario.Email),
            new(ClaimTypes.Name, usuario.Nome),
            new(ClaimTypes.Role, usuario.Role)
        };

        if (usuario.LojaId.HasValue)
            claims.Add(new Claim("LojaId", usuario.LojaId.Value.ToString()));

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<(string Token, DateTime ExpiresAt)> GerarRefreshTokenAsync(int usuarioId, CancellationToken ct)
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var expiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays);
        _db.RefreshTokens.Add(new RefreshToken
        {
            UsuarioId = usuarioId,
            Token = token,
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(ct);
        return (token, expiresAt);
    }
}

public class JwtSettings
{
    public const string SectionName = "Jwt";
    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = "CatalagoApi";
    public string Audience { get; set; } = "CatalagoApi";
    public int ExpirationMinutes { get; set; } = 60;
    public int RefreshTokenExpirationDays { get; set; } = 7;
}
