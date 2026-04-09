using CatalagoApi.Models.DTOs;
using CatalagoApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CatalagoApi.Controllers;

[ApiController]
[Route("api/v1/vitrines")]
public class VitrinessController : ControllerBase
{
    private readonly VitrineService _vitrineService;

    public VitrinessController(VitrineService vitrineService) => _vitrineService = vitrineService;

    [HttpGet("ativa")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(VitrineDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<ActionResult<VitrineDto>> ObterAtiva(CancellationToken ct)
    {
        var vitrine = await _vitrineService.ObterAtivaAsync(ct);
        if (vitrine == null)
            return NoContent();
        return Ok(vitrine);
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(IEnumerable<VitrineDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<VitrineDto>>> Listar(CancellationToken ct)
    {
        var vitrines = await _vitrineService.ListarAsync(ct);
        return Ok(vitrines);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(VitrineDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<VitrineDto>> Criar([FromBody] VitrineCreateDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var vitrine = await _vitrineService.CriarAsync(dto, ct);
        return CreatedAtAction(nameof(ObterAtiva), new { }, vitrine);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(VitrineDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VitrineDto>> Atualizar(int id, [FromBody] VitrineUpdateDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var vitrine = await _vitrineService.AtualizarAsync(id, dto, ct);
        if (vitrine == null)
            return NotFound();
        return Ok(vitrine);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Excluir(int id, CancellationToken ct)
    {
        var excluido = await _vitrineService.ExcluirAsync(id, ct);
        if (!excluido)
            return NotFound();
        return NoContent();
    }

    [HttpPost("{id:int}/itens")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(VitrineItemDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VitrineItemDto>> AdicionarItem(int id, [FromBody] VitrineItemCreateDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var (item, erro) = await _vitrineService.AdicionarItemAsync(id, dto, ct);
        if (erro == "VitrineNaoEncontrada")
            return NotFound(new { message = "Vitrine não encontrada" });
        if (erro == "ProdutoNaoEncontrado")
            return BadRequest(new { message = "Produto não encontrado" });
        return StatusCode(StatusCodes.Status201Created, item);
    }

    [HttpPut("itens/{itemId:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(VitrineItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VitrineItemDto>> AtualizarItem(int itemId, [FromBody] VitrineItemUpdateDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var (item, erro) = await _vitrineService.AtualizarItemAsync(itemId, dto, ct);
        if (erro == "NotFound")
            return NotFound();
        if (erro == "ProdutoNaoEncontrado")
            return BadRequest(new { message = "Produto não encontrado" });
        return Ok(item);
    }

    [HttpDelete("itens/{itemId:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoverItem(int itemId, CancellationToken ct)
    {
        var removido = await _vitrineService.RemoverItemAsync(itemId, ct);
        if (!removido)
            return NotFound();
        return NoContent();
    }
}
