using CatalagoApi.Models.DTOs;
using CatalagoApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CatalagoApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class ProdutosController : ControllerBase
{
    private readonly ProdutoService _produtoService;

    public ProdutosController(ProdutoService produtoService) => _produtoService = produtoService;

    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PaginacaoResponse<ProdutoListDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PaginacaoResponse<ProdutoListDto>>> Listar(
        [FromQuery] string? busca,
        [FromQuery] int? categoriaId,
        [FromQuery] int pagina = 1,
        [FromQuery] int tamanho = 20,
        CancellationToken ct = default)
    {
        var result = await _produtoService.ListarAsync(busca, categoriaId, pagina, tamanho, ct);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ProdutoDetalheDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProdutoDetalheDto>> Obter(int id, CancellationToken ct)
    {
        var produto = await _produtoService.ObterAsync(id, ct);
        if (produto == null)
            return NotFound();
        return Ok(produto);
    }

    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(ProdutoDetalheDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProdutoDetalheDto>> Criar([FromBody] ProdutoCreateDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        var (dtoCriado, erro) = await _produtoService.CriarAsync(dto, ct);
        if (erro == "CategoriaNaoEncontrada")
            return BadRequest(new { message = "Categoria não encontrada" });
        return CreatedAtAction(nameof(Obter), new { id = dtoCriado!.Id }, dtoCriado);
    }

    [HttpPut("{id:int}")]
    [Authorize]
    [ProducesResponseType(typeof(ProdutoDetalheDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProdutoDetalheDto>> Atualizar(int id, [FromBody] ProdutoUpdateDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        var (dtoAtualizado, erro) = await _produtoService.AtualizarAsync(id, dto, ct);
        if (erro == "NotFound")
            return NotFound();
        if (erro == "CategoriaNaoEncontrada")
            return BadRequest(new { message = "Categoria não encontrada" });
        if (dtoAtualizado == null) // produto desativado (Obter só retorna ativos)
            return NotFound();
        return Ok(dtoAtualizado);
    }

    [HttpPut("{id:int}/estoque")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AtualizarEstoque(int id, [FromBody] IEnumerable<EstoqueLojaDto> estoques, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        var atualizado = await _produtoService.AtualizarEstoqueAsync(id, estoques ?? [], ct);
        if (!atualizado)
            return NotFound();
        return Ok();
    }

    [HttpDelete("{id:int}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Excluir(int id, CancellationToken ct)
    {
        var excluido = await _produtoService.ExcluirAsync(id, ct);
        if (!excluido)
            return NotFound();
        return NoContent();
    }
}
