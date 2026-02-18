using CatalagoApi.Data;
using CatalagoApi.Models;
using CatalagoApi.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace CatalagoApi.Services;

public class CategoriaService
{
    private readonly AppDbContext _db;

    public CategoriaService(AppDbContext db) => _db = db;

    public async Task<IEnumerable<CategoriaDto>> ListarAsync(CancellationToken ct = default)
    {
        return await _db.Categorias
            .OrderBy(c => c.Nome)
            .Select(c => new CategoriaDto(c.Id, c.Nome, c.Descricao))
            .ToListAsync(ct);
    }

    public async Task<CategoriaDto?> ObterAsync(int id, CancellationToken ct = default)
    {
        var categoria = await _db.Categorias.FindAsync([id], ct);
        if (categoria == null)
            return null;
        return new CategoriaDto(categoria.Id, categoria.Nome, categoria.Descricao);
    }

    public async Task<CategoriaDto> CriarAsync(CategoriaCreateDto dto, CancellationToken ct = default)
    {
        var categoria = new Categoria { Nome = dto.Nome, Descricao = dto.Descricao };
        _db.Categorias.Add(categoria);
        await _db.SaveChangesAsync(ct);
        return new CategoriaDto(categoria.Id, categoria.Nome, categoria.Descricao);
    }

    public async Task<CategoriaDto?> AtualizarAsync(int id, CategoriaUpdateDto dto, CancellationToken ct = default)
    {
        var categoria = await _db.Categorias.FindAsync([id], ct);
        if (categoria == null)
            return null;

        categoria.Nome = dto.Nome;
        categoria.Descricao = dto.Descricao;
        await _db.SaveChangesAsync(ct);
        return new CategoriaDto(categoria.Id, categoria.Nome, categoria.Descricao);
    }

    /// <summary>
    /// Exclui a categoria se não houver produtos vinculados.
    /// </summary>
    /// <returns>Sucesso; Erro = "NotFound" ou "CategoriaComProdutos".</returns>
    public async Task<(bool Sucesso, string? Erro)> ExcluirAsync(int id, CancellationToken ct = default)
    {
        var categoria = await _db.Categorias
            .Include(c => c.Produtos)
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        if (categoria == null)
            return (false, "NotFound");
        if (categoria.Produtos.Count > 0)
            return (false, "CategoriaComProdutos");

        _db.Categorias.Remove(categoria);
        await _db.SaveChangesAsync(ct);
        return (true, null);
    }
}
