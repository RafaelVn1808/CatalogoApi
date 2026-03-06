using CatalagoApi.Data;
using CatalagoApi.Models;
using CatalagoApi.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace CatalagoApi.Services;

public class ProdutoService
{
    private readonly AppDbContext _db;

    public ProdutoService(AppDbContext db) => _db = db;

    public async Task<ProdutoListarResponse> ListarAsync(
        string? busca,
        int? categoriaId,
        decimal? precoMin,
        decimal? precoMax,
        bool? ativo,
        bool? disponivel,
        bool incluirInativos,
        string? ordenarPor,
        string? ordenarDirecao,
        int pagina,
        int tamanho,
        CancellationToken ct = default)
    {
        var query = _db.Produtos
            .Include(p => p.Categoria)
            .Include(p => p.ProdutosLoja)
                .ThenInclude(pl => pl.Loja)
            .AsQueryable();

        if (!incluirInativos)
            query = query.Where(p => p.Ativo);
        if (ativo.HasValue)
            query = query.Where(p => p.Ativo == ativo.Value);
        if (disponivel.HasValue)
            query = query.Where(p => p.ProdutosLoja.Any(pl => pl.Disponivel == disponivel.Value));

        if (!string.IsNullOrWhiteSpace(busca))
        {
            var termo = busca.Trim().ToLower();
            query = query.Where(p =>
                p.Nome.ToLower().Contains(termo) ||
                (p.Codigo != null && p.Codigo.ToLower().Contains(termo)) ||
                (p.Descricao != null && p.Descricao.ToLower().Contains(termo)));
        }

        if (categoriaId.HasValue)
            query = query.Where(p => p.CategoriaId == categoriaId.Value);

        if (precoMin.HasValue)
            query = query.Where(p => p.Preco >= precoMin.Value);
        if (precoMax.HasValue)
            query = query.Where(p => p.Preco <= precoMax.Value);

        var total = await query.CountAsync(ct);

        var dirAsc = !string.Equals(ordenarDirecao?.Trim(), "desc", StringComparison.OrdinalIgnoreCase);
        query = string.Equals(ordenarPor?.Trim(), "Preco", StringComparison.OrdinalIgnoreCase)
            ? (dirAsc ? query.OrderBy(p => p.Preco) : query.OrderByDescending(p => p.Preco))
            : (dirAsc ? query.OrderBy(p => p.Nome) : query.OrderByDescending(p => p.Nome));

        decimal? precoMedio = null;
        if (total > 0)
        {
            precoMedio = await query.Select(p => p.Preco).AverageAsync(ct);
        }

        var produtos = await query
            .Skip((pagina - 1) * tamanho)
            .Take(tamanho)
            .Select(p => new ProdutoListDto(
                p.Id,
                p.Nome,
                p.Descricao,
                p.Preco,
                p.ImagemUrl,
                p.Codigo,
                p.Ativo,
                p.Categoria.Nome,
                p.ProdutosLoja
                    .Where(pl => pl.Disponivel)
                    .Select(pl => new DisponibilidadeLojaDto(pl.LojaId, pl.Loja.Nome, pl.Loja.WhatsApp, pl.Disponivel))
            ))
            .ToListAsync(ct);

        var totalPaginas = (int)Math.Ceiling(total / (double)tamanho);
        return new ProdutoListarResponse(produtos, total, pagina, tamanho, totalPaginas, precoMedio);
    }

    public async Task<ProdutoDetalheDto?> ObterAsync(int id, CancellationToken ct = default)
    {
        var produto = await _db.Produtos
            .Include(p => p.Categoria)
            .Include(p => p.ProdutosLoja)
                .ThenInclude(pl => pl.Loja)
            .FirstOrDefaultAsync(p => p.Id == id && p.Ativo, ct);

        if (produto == null)
            return null;

        return new ProdutoDetalheDto(
            produto.Id,
            produto.Nome,
            produto.Descricao,
            produto.Preco,
            produto.ImagemUrl,
            produto.Codigo,
            new CategoriaDto(produto.Categoria.Id, produto.Categoria.Nome, produto.Categoria.Descricao),
            produto.ProdutosLoja
                .Where(pl => pl.Disponivel)
                .Select(pl => new DisponibilidadeLojaDto(pl.LojaId, pl.Loja.Nome, pl.Loja.WhatsApp, pl.Disponivel))
        );
    }

    /// <summary>
    /// Cria um produto e seus estoques iniciais por loja.
    /// </summary>
    /// <returns>DTO do produto criado quando sucesso; Erro = "CategoriaNaoEncontrada" quando a categoria não existir.</returns>
    public async Task<(ProdutoDetalheDto? Dto, string? Erro)> CriarAsync(ProdutoCreateDto dto, CancellationToken ct = default)
    {
        var categoria = await _db.Categorias.FindAsync([dto.CategoriaId], ct);
        if (categoria == null)
            return (null, "CategoriaNaoEncontrada");

        var produto = new Produto
        {
            Nome = dto.Nome,
            Descricao = dto.Descricao,
            Preco = dto.Preco,
            Codigo = dto.Codigo,
            CategoriaId = dto.CategoriaId,
            Ativo = true
        };

        _db.Produtos.Add(produto);
        await _db.SaveChangesAsync(ct);

        // Disponibilidade por loja (usa a primeira informada ou true)
        var disponivelInicial = dto.Estoques?.FirstOrDefault()?.Disponivel ?? true;
        var lojas = await _db.Lojas.ToListAsync(ct);
        foreach (var loja in lojas)
        {
            _db.ProdutosLoja.Add(new ProdutoLoja
            {
                ProdutoId = produto.Id,
                LojaId = loja.Id,
                Disponivel = disponivelInicial
            });
        }
        await _db.SaveChangesAsync(ct);

        var criado = await ObterAsync(produto.Id, ct);
        return (criado, null);
    }

    /// <summary>
    /// Atualiza dados do produto (sem estoque).
    /// </summary>
    /// <returns>DTO atualizado quando sucesso; Erro = "NotFound" ou "CategoriaNaoEncontrada".</returns>
    public async Task<(ProdutoDetalheDto? Dto, string? Erro)> AtualizarAsync(int id, ProdutoUpdateDto dto, CancellationToken ct = default)
    {
        var produto = await _db.Produtos
            .Include(p => p.Categoria)
            .Include(p => p.ProdutosLoja)
                .ThenInclude(pl => pl.Loja)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        if (produto == null)
            return (null, "NotFound");

        var categoria = await _db.Categorias.FindAsync([dto.CategoriaId], ct);
        if (categoria == null)
            return (null, "CategoriaNaoEncontrada");

        produto.Nome = dto.Nome;
        produto.Descricao = dto.Descricao;
        produto.Preco = dto.Preco;
        produto.ImagemUrl = dto.ImagemUrl;
        produto.Codigo = dto.Codigo;
        produto.Ativo = dto.Ativo;
        produto.CategoriaId = dto.CategoriaId;
        await _db.SaveChangesAsync(ct);

        var atualizado = await ObterAsync(produto.Id, ct);
        return (atualizado, null);
    }

    /// <summary>
    /// Atualiza apenas o status ativo/inativo do produto.
    /// </summary>
    public async Task<bool> AtualizarAtivoAsync(int id, bool ativo, CancellationToken ct = default)
    {
        var produto = await _db.Produtos.FindAsync([id], ct);
        if (produto == null)
            return false;

        produto.Ativo = ativo;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>
    /// Atualiza disponibilidade global do produto e replica para todas as lojas.
    /// Usa o primeiro item de <paramref name="estoques"/> (ou true se vazio).
    /// </summary>
    /// <returns>True se o produto existir e a operação for concluída.</returns>
    public async Task<bool> AtualizarEstoqueAsync(int produtoId, IEnumerable<EstoqueLojaDto> estoques, CancellationToken ct = default)
    {
        var produto = await _db.Produtos.FindAsync([produtoId], ct);
        if (produto == null)
            return false;

        var todasLojas = await _db.Lojas.ToListAsync(ct);
        var produtosLoja = await _db.ProdutosLoja.Where(pl => pl.ProdutoId == produtoId).ToListAsync(ct);
        var disponivelGlobal = estoques?.FirstOrDefault()?.Disponivel ?? true;

        foreach (var loja in todasLojas)
        {
            var pl = produtosLoja.FirstOrDefault(x => x.LojaId == loja.Id);
            if (pl != null)
                pl.Disponivel = disponivelGlobal;
            else
                _db.ProdutosLoja.Add(new ProdutoLoja { ProdutoId = produtoId, LojaId = loja.Id, Disponivel = disponivelGlobal });
        }
        await _db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>
    /// Exclui o produto (e estoques por cascade).
    /// </summary>
    /// <returns>True se existia e foi excluído.</returns>
    public async Task<bool> ExcluirAsync(int id, CancellationToken ct = default)
    {
        var produto = await _db.Produtos.FindAsync([id], ct);
        if (produto == null)
            return false;

        _db.Produtos.Remove(produto);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
