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
    [ProducesResponseType(typeof(ProdutoListarResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ProdutoListarResponse>> Listar(
        [FromQuery] string? busca,
        [FromQuery] int? categoriaId,
        [FromQuery] decimal? precoMin,
        [FromQuery] decimal? precoMax,
        [FromQuery] bool? ativo,
        [FromQuery] bool? disponivel,
        [FromQuery] bool incluirInativos = false,
        [FromQuery] int pagina = 1,
        [FromQuery] int tamanho = 20,
        [FromQuery] string? ordenarPor = null,
        [FromQuery] string? ordenarDirecao = null,
        CancellationToken ct = default)
    {
        pagina = Math.Max(1, pagina);
        tamanho = Math.Clamp(tamanho, 1, 100);
        var incluirInativosEfetivo = incluirInativos && User?.Identity?.IsAuthenticated == true;
        var result = await _produtoService.ListarAsync(busca, categoriaId, precoMin, precoMax, ativo, disponivel, incluirInativosEfetivo, ordenarPor, ordenarDirecao, pagina, tamanho, ct);
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
    [Authorize(Roles = "Admin")]
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
    [Authorize(Roles = "Admin")]
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

    [HttpPut("{id:int}/ativo")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AtualizarAtivo(int id, [FromBody] ProdutoAtivoDto dto, CancellationToken ct)
    {
        var atualizado = await _produtoService.AtualizarAtivoAsync(id, dto.Ativo, ct);
        if (!atualizado)
            return NotFound();
        return Ok();
    }

    [HttpPut("{id:int}/estoque")]
    [Authorize(Roles = "Admin")]
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
    [Authorize(Roles = "Admin")]
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
