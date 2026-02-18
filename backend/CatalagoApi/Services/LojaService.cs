using CatalagoApi.Data;
using CatalagoApi.Models;
using CatalagoApi.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace CatalagoApi.Services;

public class LojaService
{
    private readonly AppDbContext _db;

    public LojaService(AppDbContext db) => _db = db;

    public async Task<IEnumerable<LojaDto>> ListarAsync(CancellationToken ct = default)
    {
        return await _db.Lojas
            .OrderBy(l => l.Nome)
            .Select(l => new LojaDto(l.Id, l.Nome, l.Endereco, l.Telefone, l.WhatsApp, l.Horario))
            .ToListAsync(ct);
    }

    public async Task<LojaDto?> ObterAsync(int id, CancellationToken ct = default)
    {
        var loja = await _db.Lojas.FindAsync([id], ct);
        if (loja == null)
            return null;
        return new LojaDto(loja.Id, loja.Nome, loja.Endereco, loja.Telefone, loja.WhatsApp, loja.Horario);
    }

    public async Task<LojaDto> CriarAsync(LojaCreateDto dto, CancellationToken ct = default)
    {
        var loja = new Loja
        {
            Nome = dto.Nome,
            Endereco = dto.Endereco,
            Telefone = dto.Telefone,
            WhatsApp = dto.WhatsApp,
            Horario = dto.Horario
        };
        _db.Lojas.Add(loja);
        await _db.SaveChangesAsync(ct);
        return new LojaDto(loja.Id, loja.Nome, loja.Endereco, loja.Telefone, loja.WhatsApp, loja.Horario);
    }

    public async Task<LojaDto?> AtualizarAsync(int id, LojaUpdateDto dto, CancellationToken ct = default)
    {
        var loja = await _db.Lojas.FindAsync([id], ct);
        if (loja == null)
            return null;

        loja.Nome = dto.Nome;
        loja.Endereco = dto.Endereco;
        loja.Telefone = dto.Telefone;
        loja.WhatsApp = dto.WhatsApp;
        loja.Horario = dto.Horario;
        await _db.SaveChangesAsync(ct);
        return new LojaDto(loja.Id, loja.Nome, loja.Endereco, loja.Telefone, loja.WhatsApp, loja.Horario);
    }

    public async Task<bool> ExcluirAsync(int id, CancellationToken ct = default)
    {
        var loja = await _db.Lojas.FindAsync([id], ct);
        if (loja == null)
            return false;

        _db.Lojas.Remove(loja);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
