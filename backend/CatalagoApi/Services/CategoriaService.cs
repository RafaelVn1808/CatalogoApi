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
            .Select(c => new CategoriaDto(c.Id, c.Nome, c.Descricao, c.Prioridade))
            .ToListAsync(ct);
    }

    public async Task<CategoriaDto?> ObterAsync(int id, CancellationToken ct = default)
    {
        var categoria = await _db.Categorias.FindAsync([id], ct);
        if (categoria == null)
            return null;
        return new CategoriaDto(categoria.Id, categoria.Nome, categoria.Descricao, categoria.Prioridade);
    }

    public async Task<CategoriaDto> CriarAsync(CategoriaCreateDto dto, CancellationToken ct = default)
    {
        var categoria = new Categoria { Nome = dto.Nome, Descricao = dto.Descricao, Prioridade = dto.Prioridade };
        _db.Categorias.Add(categoria);
        await _db.SaveChangesAsync(ct);
        return new CategoriaDto(categoria.Id, categoria.Nome, categoria.Descricao, categoria.Prioridade);
    }

    public async Task<CategoriaDto?> AtualizarAsync(int id, CategoriaUpdateDto dto, CancellationToken ct = default)
    {
        var categoria = await _db.Categorias.FindAsync([id], ct);
        if (categoria == null)
            return null;

        categoria.Nome = dto.Nome;
        categoria.Descricao = dto.Descricao;
        categoria.Prioridade = dto.Prioridade;
        await _db.SaveChangesAsync(ct);
        return new CategoriaDto(categoria.Id, categoria.Nome, categoria.Descricao, categoria.Prioridade);
    }

    /// <summary>
    /// Exclui a categoria se não houver produtos vinculados.
    /// </summary>
    /// <returns>Sucesso; Erro = "NotFound" ou "CategoriaComProdutos".</returns>
    public async Task<(bool Sucesso, string? Erro)> ExcluirAsync(int id, CancellationToken ct = default)
    {
        var temProdutos = await _db.Produtos.AnyAsync(p => p.CategoriaId == id, ct);
        if (temProdutos)
            return (false, "CategoriaComProdutos");

        var categoria = await _db.Categorias.FindAsync([id], ct);
        if (categoria == null)
            return (false, "NotFound");

        _db.Categorias.Remove(categoria);
        await _db.SaveChangesAsync(ct);
        return (true, null);
    }

    /// <summary>
    /// Remove categorias cujo nome parece código/barras (criadas por engano na importação)
    /// e reatribui os produtos delas para a categoria "Geral".
    /// </summary>
    /// <returns>Quantidade de categorias removidas, produtos reatribuídos e nomes das categorias removidas.</returns>
    public async Task<(int CategoriasRemovidas, int ProdutosReatribuidos, IReadOnlyList<string> NomesRemovidos)> LimparCategoriasInvalidasAsync(CancellationToken ct = default)
    {
        var todas = await _db.Categorias.ToListAsync(ct);
        var invalidas = todas.Where(c => PareceCodigoOuBarras(c.Nome)).ToList();

        if (invalidas.Count == 0)
            return (0, 0, Array.Empty<string>());

        var geral = todas.FirstOrDefault(c => c.Nome.Trim().Equals("Geral", StringComparison.OrdinalIgnoreCase));
        if (geral == null)
        {
            geral = new Categoria { Nome = "Geral", Descricao = null };
            _db.Categorias.Add(geral);
            await _db.SaveChangesAsync(ct);
        }

        var idsInvalidas = invalidas.Select(c => c.Id).ToHashSet();
        var produtos = await _db.Produtos.Where(p => idsInvalidas.Contains(p.CategoriaId)).ToListAsync(ct);
        foreach (var p in produtos)
            p.CategoriaId = geral.Id;

        var nomesRemovidos = invalidas.Select(c => c.Nome).ToList();
        _db.Categorias.RemoveRange(invalidas);
        await _db.SaveChangesAsync(ct);

        return (invalidas.Count, produtos.Count, nomesRemovidos);
    }

    /// <summary>
    /// Indica se o texto parece código interno ou código de barras (não nome de categoria).
    /// </summary>
    private static bool PareceCodigoOuBarras(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > 20) return false;
        var s = value.Trim();
        if (s.Length >= 8 && s.Length <= 14 && s.All(char.IsDigit)) return true;
        var semEspaco = s.Replace(" ", "");
        if (semEspaco.Length >= 2 && semEspaco.All(c => char.IsDigit(c) || c == 'X' || c == 'x' || c == 'M' || c == 'm' || c == 'L' || c == 'l')) return true;
        if (s.Length <= 4 && s.All(char.IsDigit)) return true;
        // Padrão tipo 20L CANE 2F, 60M CHUMBO (tamanho + descrição)
        if (s.Any(char.IsDigit) && (s.Contains('M') || s.Contains('m') || s.Contains('L') || s.Contains('l'))) return true;
        return false;
    }
}
