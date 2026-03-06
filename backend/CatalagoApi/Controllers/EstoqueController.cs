using CatalagoApi.Models.DTOs;
using CatalagoApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CatalagoApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class EstoqueController : ControllerBase
{
    private readonly EstoqueService _estoqueService;

    public EstoqueController(EstoqueService estoqueService) => _estoqueService = estoqueService;

    /// <summary>
    /// Lista o estoque. Opcionalmente filtra por loja.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(IEnumerable<EstoqueItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<EstoqueItemDto>>> Listar(
        [FromQuery] int? lojaId,
        [FromQuery] bool apenasComEstoque = false,
        CancellationToken ct = default)
    {
        var (itens, erro) = await _estoqueService.ListarAsync(lojaId, apenasComEstoque, ct);
        if (erro == "LojaNaoEncontrada")
            return NotFound(new { message = "Loja não encontrada" });
        return Ok(itens);
    }

    /// <summary>
    /// Lista o estoque de uma loja específica (atalho para GET /api/estoque?lojaId=).
    /// </summary>
    [HttpGet("loja/{lojaId:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(IEnumerable<EstoqueItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IEnumerable<EstoqueItemDto>>> PorLoja(
        int lojaId,
        [FromQuery] bool apenasComEstoque = false,
        CancellationToken ct = default)
    {
        var (itens, erro) = await _estoqueService.PorLojaAsync(lojaId, apenasComEstoque, ct);
        if (erro == "LojaNaoEncontrada")
            return NotFound(new { message = "Loja não encontrada" });
        return Ok(itens);
    }
}
