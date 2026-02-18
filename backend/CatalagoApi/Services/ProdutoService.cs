using CatalagoApi.Data;
using CatalagoApi.Models;
using CatalagoApi.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace CatalagoApi.Services;

public class ProdutoService
{
    private readonly AppDbContext _db;

    public ProdutoService(AppDbContext db) => _db = db;

    public async Task<PaginacaoResponse<ProdutoListDto>> ListarAsync(
        string? busca,
        int? categoriaId,
        int pagina,
        int tamanho,
        CancellationToken ct = default)
    {
        var query = _db.Produtos
            .Include(p => p.Categoria)
            .Include(p => p.ProdutosLoja)
                .ThenInclude(pl => pl.Loja)
            .Where(p => p.Ativo);

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

        var total = await query.CountAsync(ct);

        var produtos = await query
            .OrderBy(p => p.Nome)
            .Skip((pagina - 1) * tamanho)
            .Take(tamanho)
            .Select(p => new ProdutoListDto(
                p.Id,
                p.Nome,
                p.Descricao,
                p.Preco,
                p.ImagemUrl,
                p.Codigo,
                p.Categoria.Nome,
                p.ProdutosLoja
                    .Where(pl => pl.Quantidade > 0)
                    .Select(pl => new DisponibilidadeLojaDto(pl.LojaId, pl.Loja.Nome, pl.Loja.WhatsApp, pl.Quantidade))
            ))
            .ToListAsync(ct);

        var totalPaginas = (int)Math.Ceiling(total / (double)tamanho);
        return new PaginacaoResponse<ProdutoListDto>(produtos, total, pagina, tamanho, totalPaginas);
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
                .Where(pl => pl.Quantidade > 0)
                .Select(pl => new DisponibilidadeLojaDto(pl.LojaId, pl.Loja.Nome, pl.Loja.WhatsApp, pl.Quantidade))
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

        foreach (var est in dto.Estoques ?? [])
        {
            var loja = await _db.Lojas.FindAsync([est.LojaId], ct);
            if (loja != null && est.Quantidade >= 0)
            {
                _db.ProdutosLoja.Add(new ProdutoLoja
                {
                    ProdutoId = produto.Id,
                    LojaId = est.LojaId,
                    Quantidade = est.Quantidade
                });
            }
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
    /// Atualiza quantidades de estoque do produto por loja.
    /// </summary>
    /// <returns>True se o produto existir e a operação for concluída.</returns>
    public async Task<bool> AtualizarEstoqueAsync(int produtoId, IEnumerable<EstoqueLojaDto> estoques, CancellationToken ct = default)
    {
        var produto = await _db.Produtos.FindAsync([produtoId], ct);
        if (produto == null)
            return false;

        foreach (var est in estoques)
        {
            var pl = await _db.ProdutosLoja
                .FirstOrDefaultAsync(x => x.ProdutoId == produtoId && x.LojaId == est.LojaId, ct);

            if (pl != null)
            {
                pl.Quantidade = Math.Max(0, est.Quantidade);
            }
            else if (est.Quantidade > 0)
            {
                var loja = await _db.Lojas.FindAsync([est.LojaId], ct);
                if (loja != null)
                {
                    _db.ProdutosLoja.Add(new ProdutoLoja
                    {
                        ProdutoId = produtoId,
                        LojaId = est.LojaId,
                        Quantidade = est.Quantidade
                    });
                }
            }
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
