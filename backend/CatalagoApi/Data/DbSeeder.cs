using CatalagoApi.Models;
using Microsoft.EntityFrameworkCore;

namespace CatalagoApi.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        if (await db.Usuarios.AnyAsync(ct))
            return;

        // Usuário admin padrão: admin@catalago.com / Admin@123
        var senhaHash = BCrypt.Net.BCrypt.HashPassword("Admin@123");
        db.Usuarios.Add(new Usuario
        {
            Email = "admin@catalago.com",
            SenhaHash = senhaHash,
            Nome = "Administrador",
            Role = "Admin"
        });
        await db.SaveChangesAsync(ct);
    }
}
