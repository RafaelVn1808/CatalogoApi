using CatalagoApi.Models.DTOs;
using CatalagoApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CatalagoApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class CategoriasController : ControllerBase
{
    private readonly CategoriaService _categoriaService;

    public CategoriasController(CategoriaService categoriaService) => _categoriaService = categoriaService;

    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IEnumerable<CategoriaDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<CategoriaDto>>> Listar(CancellationToken ct)
    {
        var categorias = await _categoriaService.ListarAsync(ct);
        return Ok(categorias);
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(CategoriaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CategoriaDto>> Obter(int id, CancellationToken ct)
    {
        var categoria = await _categoriaService.ObterAsync(id, ct);
        if (categoria == null)
            return NotFound();
        return Ok(categoria);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(CategoriaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CategoriaDto>> Criar([FromBody] CategoriaCreateDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        var categoria = await _categoriaService.CriarAsync(dto, ct);
        return CreatedAtAction(nameof(Obter), new { id = categoria.Id }, categoria);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(CategoriaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CategoriaDto>> Atualizar(int id, [FromBody] CategoriaUpdateDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        var categoria = await _categoriaService.AtualizarAsync(id, dto, ct);
        if (categoria == null)
            return NotFound();
        return Ok(categoria);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Excluir(int id, CancellationToken ct)
    {
        var (sucesso, erro) = await _categoriaService.ExcluirAsync(id, ct);
        if (erro == "NotFound")
            return NotFound();
        if (erro == "CategoriaComProdutos")
            return BadRequest(new { message = "Não é possível excluir categoria com produtos vinculados" });
        return NoContent();
    }

    /// <summary>
    /// Remove categorias inválidas (nomes que parecem código/barras) e reatribui os produtos para "Geral".
    /// </summary>
    [HttpPost("limpar-invalidas")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<object>> LimparCategoriasInvalidas(CancellationToken ct)
    {
        var (categoriasRemovidas, produtosReatribuidos, nomesRemovidos) = await _categoriaService.LimparCategoriasInvalidasAsync(ct);
        return Ok(new
        {
            categoriasRemovidas,
            produtosReatribuidos,
            nomesRemovidos
        });
    }
}
