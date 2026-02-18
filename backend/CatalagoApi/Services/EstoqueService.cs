using CatalagoApi.Data;
using CatalagoApi.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace CatalagoApi.Services;

public class EstoqueService
{
    private readonly AppDbContext _db;

    public EstoqueService(AppDbContext db) => _db = db;

    /// <summary>
    /// Lista o estoque, opcionalmente filtrado por loja.
    /// </summary>
    /// <returns>Lista de itens; Erro = "LojaNaoEncontrada" quando lojaId informado e a loja não existir.</returns>
    public async Task<(IEnumerable<EstoqueItemDto> Itens, string? Erro)> ListarAsync(
        int? lojaId,
        bool apenasComEstoque,
        CancellationToken ct = default)
    {
        if (lojaId.HasValue)
        {
            var lojaExiste = await _db.Lojas.AnyAsync(l => l.Id == lojaId.Value, ct);
            if (!lojaExiste)
                return (Array.Empty<EstoqueItemDto>(), "LojaNaoEncontrada");
        }

        var query = _db.ProdutosLoja
            .Include(pl => pl.Produto).ThenInclude(p => p!.Categoria)
            .Include(pl => pl.Loja)
            .AsQueryable();

        if (lojaId.HasValue)
            query = query.Where(pl => pl.LojaId == lojaId.Value);
        if (apenasComEstoque)
            query = query.Where(pl => pl.Quantidade > 0);

        var itens = await query
            .OrderBy(pl => pl.Loja!.Nome)
            .ThenBy(pl => pl.Produto!.Nome)
            .Select(pl => new EstoqueItemDto(
                pl.ProdutoId,
                pl.Produto!.Nome,
                pl.Produto.Codigo,
                pl.LojaId,
                pl.Loja!.Nome,
                pl.Quantidade
            ))
            .ToListAsync(ct);

        return (itens, null);
    }

    /// <summary>
    /// Lista o estoque de uma loja específica.
    /// </summary>
    /// <returns>Lista de itens ou Erro = "LojaNaoEncontrada".</returns>
    public async Task<(IEnumerable<EstoqueItemDto>? Itens, string? Erro)> PorLojaAsync(
        int lojaId,
        bool apenasComEstoque,
        CancellationToken ct = default)
    {
        var loja = await _db.Lojas.FindAsync([lojaId], ct);
        if (loja == null)
            return (null, "LojaNaoEncontrada");

        var query = _db.ProdutosLoja
            .Include(pl => pl.Produto)
            .Include(pl => pl.Loja)
            .Where(pl => pl.LojaId == lojaId);

        if (apenasComEstoque)
            query = query.Where(pl => pl.Quantidade > 0);

        var itens = await query
            .OrderBy(pl => pl.Produto!.Nome)
            .Select(pl => new EstoqueItemDto(
                pl.ProdutoId,
                pl.Produto!.Nome,
                pl.Produto.Codigo,
                pl.LojaId,
                pl.Loja!.Nome,
                pl.Quantidade
            ))
            .ToListAsync(ct);

        return (itens, null);
    }
}
