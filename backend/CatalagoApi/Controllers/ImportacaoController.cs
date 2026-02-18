using CatalagoApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CatalagoApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ImportacaoController : ControllerBase
{
    private readonly ImportacaoCsvService _importacaoService;

    public ImportacaoController(ImportacaoCsvService importacaoService) => _importacaoService = importacaoService;

    /// <summary>
    /// Importa produtos a partir de arquivo CSV ou XLSX.
    /// Colunas esperadas: #, Produto, Código de barras, Categoria, Marca, Estoque, Preço do fornecedor, Preço de custo, Preço de venda.
    /// Primeira linha = cabeçalho. CSV com separador ; ou ,
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ImportacaoCsvResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ImportacaoCsvResult>> Importar(IFormFile? file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Envie um arquivo (form-data: file). Formatos: .csv, .txt ou .xlsx" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        ImportacaoCsvResult result;

        await using var stream = file.OpenReadStream();

        if (ext == ".xlsx")
        {
            result = await _importacaoService.ImportarXlsxAsync(stream, ct);
        }
        else if (ext == ".csv" || ext == ".txt")
        {
            result = await _importacaoService.ImportarCsvAsync(stream, ct);
        }
        else
        {
            return BadRequest(new { message = "Formato não suportado. Use .csv, .txt ou .xlsx" });
        }

        if (result.Erros.Count > 0 && result.LinhasProcessadas == 0)
            return BadRequest(result);

        return Ok(result);
    }
}
