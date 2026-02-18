using CatalagoApi.Data;
using CatalagoApi.Models;
using CatalagoApi.Models.DTOs;
using CatalagoApi.Services;
using Microsoft.EntityFrameworkCore;

namespace CatalagoApi.Tests;

public class CategoriaServiceTests
{
    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task ListarAsync_Vazio_RetornaListaVazia()
    {
        await using var db = CreateDbContext();
        var service = new CategoriaService(db);

        var result = await service.ListarAsync(default);

        Assert.Empty(result);
    }

    [Fact]
    public async Task CriarAsync_RetornaCategoriaComId()
    {
        await using var db = CreateDbContext();
        var service = new CategoriaService(db);

        var dto = await service.CriarAsync(new CategoriaCreateDto("Eletrônicos", "Produtos eletrônicos"), default);

        Assert.True(dto.Id > 0);
        Assert.Equal("Eletrônicos", dto.Nome);
        Assert.Equal("Produtos eletrônicos", dto.Descricao);
    }

    [Fact]
    public async Task ExcluirAsync_CategoriaComProdutos_RetornaErro()
    {
        await using var db = CreateDbContext();
        var cat = new Categoria { Nome = "Cat", Descricao = null };
        db.Categorias.Add(cat);
        await db.SaveChangesAsync();
        db.Produtos.Add(new Produto { Nome = "P", Preco = 1, CategoriaId = cat.Id });
        await db.SaveChangesAsync();

        var service = new CategoriaService(db);
        var (sucesso, erro) = await service.ExcluirAsync(cat.Id, default);

        Assert.False(sucesso);
        Assert.Equal("CategoriaComProdutos", erro);
    }

    [Fact]
    public async Task ExcluirAsync_CategoriaSemProdutos_Exclui()
    {
        await using var db = CreateDbContext();
        var cat = new Categoria { Nome = "Cat", Descricao = null };
        db.Categorias.Add(cat);
        await db.SaveChangesAsync();

        var service = new CategoriaService(db);
        var (sucesso, erro) = await service.ExcluirAsync(cat.Id, default);

        Assert.True(sucesso);
        Assert.Null(erro);
        Assert.False(await db.Categorias.AnyAsync(c => c.Id == cat.Id));
    }
}
