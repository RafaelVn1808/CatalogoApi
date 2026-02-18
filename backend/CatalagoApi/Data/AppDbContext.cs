using CatalagoApi.Models;
using Microsoft.EntityFrameworkCore;

namespace CatalagoApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    public DbSet<Produto> Produtos => Set<Produto>();
    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Loja> Lojas => Set<Loja>();
    public DbSet<ProdutoLoja> ProdutosLoja => Set<ProdutoLoja>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ProdutoLoja - chave composta
        modelBuilder.Entity<ProdutoLoja>()
            .HasKey(pl => new { pl.ProdutoId, pl.LojaId });

        modelBuilder.Entity<ProdutoLoja>()
            .HasOne(pl => pl.Produto)
            .WithMany(p => p.ProdutosLoja)
            .HasForeignKey(pl => pl.ProdutoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProdutoLoja>()
            .HasOne(pl => pl.Loja)
            .WithMany(l => l.ProdutosLoja)
            .HasForeignKey(pl => pl.LojaId)
            .OnDelete(DeleteBehavior.Cascade);

        // Índices para performance
        modelBuilder.Entity<Produto>()
            .HasIndex(p => p.CategoriaId);
        modelBuilder.Entity<Produto>()
            .HasIndex(p => p.Ativo);
        modelBuilder.Entity<Produto>()
            .HasIndex(p => p.Codigo);
        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<RefreshToken>()
            .HasOne(rt => rt.Usuario)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(rt => rt.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<RefreshToken>()
            .HasIndex(rt => rt.Token);
        modelBuilder.Entity<RefreshToken>()
            .HasIndex(rt => rt.ExpiresAt);
    }
}
