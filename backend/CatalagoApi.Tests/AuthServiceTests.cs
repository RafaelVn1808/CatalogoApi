using CatalagoApi.Data;
using CatalagoApi.Models;
using CatalagoApi.Models.DTOs;
using CatalagoApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CatalagoApi.Tests;

public class AuthServiceTests
{
    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task LoginAsync_UsuarioInexistente_RetornaNull()
    {
        await using var db = CreateDbContext();
        var jwt = new JwtSettings { Key = new string('x', 32), Issuer = "Test", Audience = "Test", ExpirationMinutes = 60, RefreshTokenExpirationDays = 7 };
        var service = new AuthService(db, Options.Create(jwt));

        var result = await service.LoginAsync(new LoginRequest("nao@existe.com", "senha123"), default);

        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_SenhaErrada_RetornaNull()
    {
        await using var db = CreateDbContext();
        var hash = BCrypt.Net.BCrypt.HashPassword("correta123");
        db.Usuarios.Add(new Usuario { Email = "u@test.com", SenhaHash = hash, Nome = "User", Role = "Admin" });
        await db.SaveChangesAsync();

        var jwt = new JwtSettings { Key = new string('x', 32), Issuer = "Test", Audience = "Test", ExpirationMinutes = 60, RefreshTokenExpirationDays = 7 };
        var service = new AuthService(db, Options.Create(jwt));

        var result = await service.LoginAsync(new LoginRequest("u@test.com", "senhaerrada"), default);

        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_CredenciaisCorretas_RetornaTokenResponse()
    {
        await using var db = CreateDbContext();
        var hash = BCrypt.Net.BCrypt.HashPassword("senha123");
        db.Usuarios.Add(new Usuario { Email = "u@test.com", SenhaHash = hash, Nome = "User", Role = "Admin" });
        await db.SaveChangesAsync();

        var jwt = new JwtSettings { Key = new string('x', 32), Issuer = "Test", Audience = "Test", ExpirationMinutes = 60, RefreshTokenExpirationDays = 7 };
        var service = new AuthService(db, Options.Create(jwt));

        var result = await service.LoginAsync(new LoginRequest("u@test.com", "senha123"), default);

        Assert.NotNull(result);
        Assert.NotEmpty(result.AccessToken);
        Assert.NotEmpty(result.RefreshToken);
        Assert.Equal("User", result.Nome);
        Assert.Equal("u@test.com", result.Email);
        Assert.Equal("Admin", result.Role);
    }

    [Fact]
    public async Task RefreshAsync_TokenInvalido_RetornaNull()
    {
        await using var db = CreateDbContext();
        var jwt = new JwtSettings { Key = new string('x', 32), Issuer = "Test", Audience = "Test", ExpirationMinutes = 60, RefreshTokenExpirationDays = 7 };
        var service = new AuthService(db, Options.Create(jwt));

        var result = await service.RefreshAsync(new RefreshTokenRequest("token-invalido"), default);

        Assert.Null(result);
    }
}
