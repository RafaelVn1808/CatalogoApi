using System.IO;
using System.Text;
using CatalagoApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NPOI.POIFS.FileSystem;

namespace CatalagoApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "Admin")]
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
    [RequestSizeLimit(10_000_000)]
    [ProducesResponseType(typeof(ImportacaoCsvResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ImportacaoCsvResult>> Importar(
        IFormFile? file,
        [FromForm] bool somenteEstoque = true,
        [FromForm] bool criarNovos = false,
        [FromForm] bool apenasCodigoCategoria = false,
        CancellationToken ct = default)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Envie um arquivo (form-data: file). Formatos: .csv, .txt, .xlsx ou .xls" });

        // Copia o arquivo para memória antes de processar para não depender da conexão do cliente
        await using var memStream = new MemoryStream();
        await file.CopyToAsync(memStream, ct);
        memStream.Position = 0;

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        ImportacaoCsvResult result;
        var options = new ImportacaoCsvOptions(
            SomenteEstoque: apenasCodigoCategoria ? false : somenteEstoque,
            CriarNovos: apenasCodigoCategoria ? false : (somenteEstoque ? false : criarNovos),
            ApenasCodigoCategoria: apenasCodigoCategoria
        );

        // Usa CancellationToken.None para que o processamento não seja cancelado se o cliente fechar a conexão
        Stream stream = memStream;

        if (ext == ".xlsx")
        {
            result = await _importacaoService.ImportarXlsxAsync(stream, options, CancellationToken.None);
        }
        else if (ext == ".xls")
        {
            await using var ms = await CopyToMemoryStreamAsync(stream, CancellationToken.None);
            var isCsvByContent = await IsCsvContentAsync(ms, CancellationToken.None);
            ms.Position = 0;
            if (isCsvByContent)
            {
                result = await _importacaoService.ImportarCsvAsync(ms, options, CancellationToken.None);
            }
            else
            {
                try
                {
                    result = await _importacaoService.ImportarXlsAsync(ms, options, CancellationToken.None);
                }
                catch (NotOLE2FileException)
                {
                    ms.Position = 0;
                    result = await _importacaoService.ImportarCsvAsync(ms, options, CancellationToken.None);
                }
            }
        }
        else if (ext == ".csv" || ext == ".txt")
        {
            result = await _importacaoService.ImportarCsvAsync(stream, options, CancellationToken.None);
        }
        else
        {
            return BadRequest(new { message = "Formato não suportado. Use .csv, .txt, .xlsx ou .xls" });
        }

        if (result.Erros.Count > 0 && result.LinhasProcessadas == 0)
            return BadRequest(result);

        return Ok(result);
    }

    private static async Task<MemoryStream> CopyToMemoryStreamAsync(Stream source, CancellationToken ct)
    {
        var ms = new MemoryStream();
        await source.CopyToAsync(ms, ct);
        ms.Position = 0;
        return ms;
    }

    /// <summary>
    /// Detecta se o stream parece CSV (primeira linha contém separador ;). Útil para arquivos .xls com conteúdo CSV (ex.: .csv.xls).
    /// </summary>
    private static async Task<bool> IsCsvContentAsync(Stream stream, CancellationToken ct)
    {
        stream.Position = 0;
        using var reader = new StreamReader(stream, Encoding.UTF8, leaveOpen: true);
        var firstLine = await reader.ReadLineAsync(ct);
        return firstLine != null && firstLine.IndexOf(';') >= 0;
    }
}
