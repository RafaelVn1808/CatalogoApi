using CatalagoApi.Models.DTOs;
using CatalagoApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CatalagoApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class LojasController : ControllerBase
{
    private readonly LojaService _lojaService;

    public LojasController(LojaService lojaService) => _lojaService = lojaService;

    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IEnumerable<LojaDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<LojaDto>>> Listar(CancellationToken ct)
    {
        var lojas = await _lojaService.ListarAsync(ct);
        return Ok(lojas);
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LojaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LojaDto>> Obter(int id, CancellationToken ct)
    {
        var loja = await _lojaService.ObterAsync(id, ct);
        if (loja == null)
            return NotFound();
        return Ok(loja);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(LojaDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<LojaDto>> Criar([FromBody] LojaCreateDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        var loja = await _lojaService.CriarAsync(dto, ct);
        return CreatedAtAction(nameof(Obter), new { id = loja.Id }, loja);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(LojaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LojaDto>> Atualizar(int id, [FromBody] LojaUpdateDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        var loja = await _lojaService.AtualizarAsync(id, dto, ct);
        if (loja == null)
            return NotFound();
        return Ok(loja);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Excluir(int id, CancellationToken ct)
    {
        var excluido = await _lojaService.ExcluirAsync(id, ct);
        if (!excluido)
            return NotFound();
        return NoContent();
    }
}
