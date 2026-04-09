using CatalagoApi.Data;
using CatalagoApi.Models;
using CatalagoApi.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace CatalagoApi.Services;

public class VitrineService
{
    private readonly AppDbContext _db;
    private readonly SupabaseStorageService _storage;

    public VitrineService(AppDbContext db, SupabaseStorageService storage)
    {
        _db = db;
        _storage = storage;
    }

    private static VitrineItemDto MapItem(VitrinePromocionalItem i) => new(
        i.Id, i.VitrineId, i.ProdutoId, i.Produto?.Nome,
        i.ImagemUrl, i.Titulo, i.Subtitulo, i.LinkUrl, i.Ordem, i.Ativo);

    private static VitrineDto MapVitrine(VitrinePromocional v) => new(
        v.Id, v.Nome, v.Ativa, v.DataInicio, v.DataFim, v.AutoPlayMs,
        v.Itens.OrderBy(i => i.Ordem).Select(MapItem));

    /// <summary>
    /// Retorna a vitrine ativa no momento atual (Ativa=true dentro da janela de datas), incluindo apenas itens ativos.
    /// </summary>
    public async Task<VitrineDto?> ObterAtivaAsync(CancellationToken ct = default)
    {
        var agora = DateTime.UtcNow;
        var vitrine = await _db.Vitrines
            .Include(v => v.Itens.Where(i => i.Ativo))
                .ThenInclude(i => i.Produto)
            .Where(v =>
                v.Ativa &&
                (v.DataInicio == null || v.DataInicio <= agora) &&
                (v.DataFim == null || v.DataFim >= agora))
            .OrderByDescending(v => v.DataInicio)
            .FirstOrDefaultAsync(ct);

        return vitrine == null ? null : MapVitrine(vitrine);
    }

    public async Task<IEnumerable<VitrineDto>> ListarAsync(CancellationToken ct = default)
    {
        var vitrines = await _db.Vitrines
            .Include(v => v.Itens)
                .ThenInclude(i => i.Produto)
            .OrderByDescending(v => v.DataInicio)
            .ToListAsync(ct);

        return vitrines.Select(MapVitrine);
    }

    public async Task<VitrineDto> CriarAsync(VitrineCreateDto dto, CancellationToken ct = default)
    {
        var vitrine = new VitrinePromocional
        {
            Nome = dto.Nome,
            Ativa = dto.Ativa,
            DataInicio = dto.DataInicio,
            DataFim = dto.DataFim,
            AutoPlayMs = dto.AutoPlayMs
        };
        _db.Vitrines.Add(vitrine);
        await _db.SaveChangesAsync(ct);
        vitrine.Itens = [];
        return MapVitrine(vitrine);
    }

    public async Task<VitrineDto?> AtualizarAsync(int id, VitrineUpdateDto dto, CancellationToken ct = default)
    {
        var vitrine = await _db.Vitrines
            .Include(v => v.Itens)
                .ThenInclude(i => i.Produto)
            .FirstOrDefaultAsync(v => v.Id == id, ct);

        if (vitrine == null)
            return null;

        vitrine.Nome = dto.Nome;
        vitrine.Ativa = dto.Ativa;
        vitrine.DataInicio = dto.DataInicio;
        vitrine.DataFim = dto.DataFim;
        vitrine.AutoPlayMs = dto.AutoPlayMs;
        await _db.SaveChangesAsync(ct);
        return MapVitrine(vitrine);
    }

    public async Task<bool> ExcluirAsync(int id, CancellationToken ct = default)
    {
        var vitrine = await _db.Vitrines
            .Include(v => v.Itens)
            .FirstOrDefaultAsync(v => v.Id == id, ct);
        if (vitrine == null)
            return false;

        foreach (var item in vitrine.Itens)
        {
            if (!string.IsNullOrEmpty(item.ImagemUrl))
                await _storage.DeleteAsync(item.ImagemUrl, ct);
        }

        _db.Vitrines.Remove(vitrine);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<(VitrineItemDto? Item, string? Erro)> AdicionarItemAsync(int vitrineId, VitrineItemCreateDto dto, CancellationToken ct = default)
    {
        var vitrine = await _db.Vitrines.FindAsync([vitrineId], ct);
        if (vitrine == null)
            return (null, "VitrineNaoEncontrada");

        if (dto.ProdutoId.HasValue)
        {
            var existe = await _db.Produtos.AnyAsync(p => p.Id == dto.ProdutoId.Value, ct);
            if (!existe)
                return (null, "ProdutoNaoEncontrado");
        }

        var item = new VitrinePromocionalItem
        {
            VitrineId = vitrineId,
            ProdutoId = dto.ProdutoId,
            ImagemUrl = dto.ImagemUrl,
            Titulo = dto.Titulo,
            Subtitulo = dto.Subtitulo,
            LinkUrl = dto.LinkUrl,
            Ordem = dto.Ordem,
            Ativo = dto.Ativo
        };
        _db.VitrineItens.Add(item);
        await _db.SaveChangesAsync(ct);

        await _db.Entry(item).Reference(i => i.Produto).LoadAsync(ct);
        return (MapItem(item), null);
    }

    public async Task<(VitrineItemDto? Item, string? Erro)> AtualizarItemAsync(int itemId, VitrineItemUpdateDto dto, CancellationToken ct = default)
    {
        var item = await _db.VitrineItens
            .Include(i => i.Produto)
            .FirstOrDefaultAsync(i => i.Id == itemId, ct);

        if (item == null)
            return (null, "NotFound");

        if (dto.ProdutoId.HasValue)
        {
            var existe = await _db.Produtos.AnyAsync(p => p.Id == dto.ProdutoId.Value, ct);
            if (!existe)
                return (null, "ProdutoNaoEncontrado");
        }

        item.ImagemUrl = dto.ImagemUrl;
        item.ProdutoId = dto.ProdutoId;
        item.Titulo = dto.Titulo;
        item.Subtitulo = dto.Subtitulo;
        item.LinkUrl = dto.LinkUrl;
        item.Ordem = dto.Ordem;
        item.Ativo = dto.Ativo;
        await _db.SaveChangesAsync(ct);

        await _db.Entry(item).Reference(i => i.Produto).LoadAsync(ct);
        return (MapItem(item), null);
    }

    public async Task<bool> RemoverItemAsync(int itemId, CancellationToken ct = default)
    {
        var item = await _db.VitrineItens.FindAsync([itemId], ct);
        if (item == null)
            return false;

        if (!string.IsNullOrEmpty(item.ImagemUrl))
            await _storage.DeleteAsync(item.ImagemUrl, ct);

        _db.VitrineItens.Remove(item);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
