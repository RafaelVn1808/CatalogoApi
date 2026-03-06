using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using CatalagoApi.Data;
using CatalagoApi.Models;
using Microsoft.EntityFrameworkCore;
using NPOI.HSSF.UserModel;
using NPOI.SS.UserModel;

namespace CatalagoApi.Services;

public class ImportacaoCsvResult
{
    public int LinhasProcessadas { get; set; }
    public int ProdutosCriados { get; set; }
    public int ProdutosAtualizados { get; set; }
    public int ProdutosNaoEncontrados { get; set; }
    /// <summary>Total de linhas de dados no arquivo (excluindo cabeçalho).</summary>
    public int TotalLinhasNoArquivo { get; set; }
    /// <summary>Linhas ignoradas por nome do produto vazio.</summary>
    public int LinhasIgnoradasNomeVazio { get; set; }
    /// <summary>Linhas ignoradas por preço de venda inválido.</summary>
    public int LinhasIgnoradasPrecoInvalido { get; set; }
    public IList<string> Erros { get; } = new List<string>();
    public IList<string> Pendencias { get; } = new List<string>();
    public bool Sucesso => Erros.Count == 0;
}

public record ImportacaoCsvOptions(
    bool SomenteEstoque = true,
    bool CriarNovos = false,
    /// <summary>Quando true, usa o arquivo apenas para vincular código (extraído de "77 - NOME") e categoria. Não cria produtos, não altera nome/preço/estoque.</summary>
    bool ApenasCodigoCategoria = false
);

/// <summary>
/// Importa produtos a partir de CSV ou XLSX. Aceita modelos como:
/// - #, Produto, Código de barras, Categoria, Marca, Estoque, Preço do fornecedor, Preço de custo, Preço de venda
/// - Posição de estoque: Código, Produto, NCM, Estoque, Unidade, Última movimentação, Preço de custo, Total custo, Preço de venda, Total venda (separador ;)
/// </summary>
public class ImportacaoCsvService
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");
    private readonly AppDbContext _db;

    // Nomes de colunas aceitos (cabeçalho do arquivo)
    // Ordem importa: nomes mais específicos primeiro para não pegar coluna errada (ex.: "Código de barras" antes de "Codigo")
    private static readonly string[] ColProduto = ["Produto", "produto", "Nome", "nome"];
    private static readonly string[] ColCodigoBarras = ["Código de barras", "Codigo de barras", "codigo de barras", "EAN", "ean", "Código", "código", "Codigo", "codigo"];
    private static readonly string[] ColCategoria = ["Categoria", "categoria"];
    private static readonly string[] ColEstoque = ["Estoque", "estoque"];
    private static readonly string[] ColDisponivel = ["Disponível", "Disponivel", "disponível", "disponivel"];
    // Preço de VENDA: nomes que devem conter "venda" e NÃO conter "custo" nem "fornecedor"
    private static readonly string[] ColPrecoVenda = ["Preço de venda", "Preco de venda", "preco de venda", "Preço de Venda", "Preco de Venda"];

    public ImportacaoCsvService(AppDbContext db) => _db = db;

    /// <summary>
    /// Importa a partir de um stream CSV (separador ; ou ,). Primeira linha = cabeçalho.
    /// Suporta quebra de linha dentro de campos entre aspas.
    /// </summary>
    public async Task<ImportacaoCsvResult> ImportarCsvAsync(
        Stream csvStream,
        ImportacaoCsvOptions? options = null,
        CancellationToken ct = default)
    {
        options ??= new ImportacaoCsvOptions();
        var rows = new List<List<string>>();
        using var reader = new StreamReader(csvStream, Encoding.UTF8);
        char? delimiter = null;
        bool? usaAspas = null;
        await foreach (var logicalLine in ReadCsvLogicalLinesAsync(reader, ct))
        {
            if (string.IsNullOrWhiteSpace(logicalLine)) continue;
            if (delimiter == null)
            {
                delimiter = DetectCsvDelimiter(logicalLine);
                usaAspas = CsvUsaAspasCampo(logicalLine, delimiter.Value);
            }
            rows.Add(ParseCsvLine(logicalLine, delimiter.Value, usaAspas!.Value));
        }
        return await ImportarDeLinhasAsync(rows, options, ct);
    }

    /// <summary>
    /// Lê o stream linha a linha, juntando linhas quando há aspas estruturais não fechadas (campo com quebra de linha).
    /// Aspas que aparecem no meio de um valor (ex.: polegadas 14") são ignoradas.
    /// Se o CSV não usa campos entre aspas, cada linha física é emitida diretamente.
    /// </summary>
    private static async IAsyncEnumerable<string> ReadCsvLogicalLinesAsync(StreamReader reader, CancellationToken ct)
    {
        bool? usaAspasCampo = null;
        var sb = new StringBuilder();
        char delimiter = ';';
        string? line;
        while ((line = await reader.ReadLineAsync(ct)) != null)
        {
            if (usaAspasCampo == null)
            {
                delimiter = DetectCsvDelimiter(line);
                usaAspasCampo = CsvUsaAspasCampo(line, delimiter);
            }

            if (usaAspasCampo == false)
            {
                yield return line;
                continue;
            }

            if (sb.Length > 0) sb.Append('\n');
            sb.Append(line);
            var s = sb.ToString();
            if (ContaAspasEstruturais(s, delimiter) % 2 == 0)
            {
                yield return s;
                sb.Clear();
            }
        }
        if (sb.Length > 0)
            yield return sb.ToString();
    }

    /// <summary>
    /// Verifica se o CSV usa aspas como delimitadores de campo (ex.: "valor";...).
    /// Retorna true se algum campo na primeira linha começa com aspas.
    /// </summary>
    private static bool CsvUsaAspasCampo(string firstLine, char delimiter)
    {
        if (firstLine.Length > 0 && firstLine[0] == '"')
            return true;
        var pattern = $"{delimiter}\"";
        return firstLine.Contains(pattern);
    }

    /// <summary>
    /// Conta apenas aspas "estruturais" (que abrem/fecham campos CSV): aspa no início de campo
    /// (posição 0 ou logo após delimitador) ou aspa seguida de delimitador/fim de string.
    /// Aspas no meio de valores (ex.: 14") são ignoradas.
    /// </summary>
    private static int ContaAspasEstruturais(string s, char delimiter)
    {
        var count = 0;
        for (var i = 0; i < s.Length; i++)
        {
            if (s[i] != '"') continue;
            var atFieldStart = i == 0 || s[i - 1] == delimiter || s[i - 1] == '\n';
            var atFieldEnd = i == s.Length - 1 || s[i + 1] == delimiter || s[i + 1] == '\n';
            if (atFieldStart || atFieldEnd)
                count++;
        }
        return count;
    }

    /// <summary>
    /// Importa a partir de um stream XLSX. Usa a primeira planilha; primeira linha = cabeçalho.
    /// </summary>
    public async Task<ImportacaoCsvResult> ImportarXlsxAsync(
        Stream xlsxStream,
        ImportacaoCsvOptions? options = null,
        CancellationToken ct = default)
    {
        options ??= new ImportacaoCsvOptions();
        var rows = new List<List<string>>();
        using (var workbook = new XLWorkbook(xlsxStream))
        {
            var ws = workbook.Worksheets.First();
            var used = ws.RangeUsed();
            if (used == null) return new ImportacaoCsvResult { Erros = { "Planilha vazia." } };

            var lastRow = used.LastRow().RowNumber();
            var lastCol = used.LastColumn().ColumnNumber();
            for (var r = 1; r <= lastRow; r++)
            {
                ct.ThrowIfCancellationRequested();
                var row = new List<string>();
                for (var c = 1; c <= lastCol; c++)
                {
                    var cell = ws.Cell(r, c);
                    var v = cell.GetString();
                    if (string.IsNullOrEmpty(v) && cell.TryGetValue(out double num))
                        v = num.ToString(PtBr);
                    row.Add(v?.Trim() ?? "");
                }
                if (row.Any(s => !string.IsNullOrWhiteSpace(s)))
                    rows.Add(row);
            }
        }
        return await ImportarDeLinhasAsync(rows, options, ct);
    }

    /// <summary>
    /// Importa a partir de um stream XLS (Excel 97-2003). Usa a primeira planilha; primeira linha = cabeçalho.
    /// </summary>
    public async Task<ImportacaoCsvResult> ImportarXlsAsync(
        Stream xlsStream,
        ImportacaoCsvOptions? options = null,
        CancellationToken ct = default)
    {
        options ??= new ImportacaoCsvOptions();
        var rows = new List<List<string>>();
        // Cópia local: HSSFWorkbook.Dispose() fecha o stream; o chamador pode precisar do stream (ex.: fallback para CSV)
        using var copy = new MemoryStream();
        await xlsStream.CopyToAsync(copy, ct);
        copy.Position = 0;
        using (var workbook = new HSSFWorkbook(copy))
        {
            var sheet = workbook.GetSheetAt(0);
            if (sheet == null || sheet.LastRowNum < 0)
                return new ImportacaoCsvResult { Erros = { "Planilha vazia." } };

            for (var r = 0; r <= sheet.LastRowNum; r++)
            {
                ct.ThrowIfCancellationRequested();
                var rowObj = sheet.GetRow(r);
                var row = new List<string>();
                if (rowObj != null)
                {
                    var lastCellNum = rowObj.LastCellNum;
                    if (lastCellNum < 0) lastCellNum = 0;
                    for (var c = 0; c < lastCellNum; c++)
                    {
                        var cell = rowObj.GetCell(c);
                        row.Add(GetCellValueAsString(cell));
                    }
                }
                // Inclui a linha para manter numeração correta (linha vazia será tratada na importação)
                rows.Add(row);
            }
        }
        return await ImportarDeLinhasAsync(rows, options, ct);
    }

    private static string GetCellValueAsString(ICell? cell)
    {
        if (cell == null) return "";
        switch (cell.CellType)
        {
            case CellType.String:
                return cell.StringCellValue?.Trim() ?? "";
            case CellType.Numeric:
                if (DateUtil.IsCellDateFormatted(cell))
                {
                    var dt = cell.DateCellValue;
                    return dt.HasValue ? dt.Value.ToString("g", PtBr) : "";
                }
                return cell.NumericCellValue.ToString(PtBr) ?? "";
            case CellType.Boolean:
                return cell.BooleanCellValue.ToString();
            case CellType.Formula:
                try
                {
                    if (cell.CachedFormulaResultType == CellType.Numeric)
                        return cell.NumericCellValue.ToString(PtBr) ?? "";
                    if (cell.CachedFormulaResultType == CellType.String)
                        return cell.StringCellValue?.Trim() ?? "";
                }
                catch { /* fallback */ }
                return cell.ToString()?.Trim() ?? "";
            default:
                return cell.ToString()?.Trim() ?? "";
        }
    }

    private async Task<ImportacaoCsvResult> ImportarDeLinhasAsync(
        List<List<string>> rows,
        ImportacaoCsvOptions options,
        CancellationToken ct)
    {
        var result = new ImportacaoCsvResult();
        if (rows.Count == 0)
        {
            result.Erros.Add("Arquivo sem linhas.");
            return result;
        }

        var header = rows[0];
        var numCols = header.Count;
        // Normaliza todas as linhas para ter o mesmo número de colunas do cabeçalho (evita índice errado)
        for (var r = 1; r < rows.Count; r++)
        {
            while (rows[r].Count < numCols)
                rows[r].Add("");
        }
        result.TotalLinhasNoArquivo = rows.Count - 1;
        var idxProduto = ObterIndice(header, ColProduto);
        var idxCodigo = ObterIndice(header, ColCodigoBarras);
        var idxCategoria = ObterIndice(header, ColCategoria);
        var idxEstoque = ObterIndice(header, ColEstoque);
        var idxDisponivel = ObterIndice(header, ColDisponivel);
        var idxPrecoVenda = ObterIndicePrecoVenda(header);

        if (idxProduto < 0)
        {
            result.Erros.Add("Cabeçalho deve conter ao menos: 'Produto'.");
            return result;
        }

        if (options.ApenasCodigoCategoria)
            return await ImportarApenasCodigoCategoriaAsync(rows, idxProduto, idxCategoria, result, ct);

        var categoriasPorNome = await _db.Categorias.ToDictionaryAsync(c => c.Nome.Trim().ToUpperInvariant(), c => c, StringComparer.OrdinalIgnoreCase);
        var todasLojas = await _db.Lojas.OrderBy(l => l.Id).ToListAsync(ct);
        // Agrupa por código para lidar com possíveis duplicidades já existentes no banco
        var produtosLista = await _db.Produtos.Include(p => p.ProdutosLoja).ToListAsync(ct);
        var produtosPorCodigo = new Dictionary<string, List<Produto>>(StringComparer.OrdinalIgnoreCase);
        foreach (var p in produtosLista)
        {
            var key = (p.Codigo ?? "").Trim().ToUpperInvariant();
            if (string.IsNullOrEmpty(key)) continue;
            if (!produtosPorCodigo.TryGetValue(key, out var lista))
            {
                lista = new List<Produto>();
                produtosPorCodigo[key] = lista;
            }
            lista.Add(p);
        }

        for (var i = 1; i < rows.Count; i++)
        {
            ct.ThrowIfCancellationRequested();
            var valores = rows[i];
            var linhaNum = i + 1;

            var nome = ObterValor(valores, idxProduto).Trim();
            // Pula linha de totais do relatório
            if (nome.StartsWith("Totais do relatório", StringComparison.OrdinalIgnoreCase) ||
                nome.StartsWith("Totais do relatorio", StringComparison.OrdinalIgnoreCase))
                continue;
            // Fallback: se a coluna "Produto" estiver vazia (ex.: célula mesclada no Excel), usa a primeira célula não vazia
            if (string.IsNullOrEmpty(nome))
            {
                for (var c = 0; c < valores.Count; c++)
                {
                    var cell = valores[c].Trim();
                    if (!string.IsNullOrEmpty(cell) && cell.Length <= 500)
                    {
                        nome = cell;
                        break;
                    }
                }
            }
            if (string.IsNullOrEmpty(nome))
            {
                result.LinhasIgnoradasNomeVazio++;
                result.Erros.Add($"Linha {linhaNum}: Produto (nome) é obrigatório.");
                continue;
            }
            // Evita "produto gigante" (várias linhas concatenadas por aspas/quebra no CSV)
            if (nome.Length > 500)
            {
                result.LinhasIgnoradasNomeVazio++;
                result.Pendencias.Add($"Linha {linhaNum}: nome do produto muito longo ({nome.Length} caracteres) — possível concatenação de linhas; linha ignorada.");
                continue;
            }

            var codigoBarras = ObterValor(valores, idxCodigo).Trim();
            var categoriaNome = ObterValor(valores, idxCategoria).Trim();
            // Se o valor parece código/barras (coluna errada), não usar como categoria
            if (PareceCodigoOuBarras(categoriaNome)) categoriaNome = "";
            var estoqueStr = ObterValor(valores, idxEstoque).Trim();
            var disponivelStr = ObterValor(valores, idxDisponivel).Trim();
            var precoVendaStr = ObterValor(valores, idxPrecoVenda).Trim();

            // Disponibilidade: coluna "Disponível" (S/N) ou fallback pela coluna "Estoque" (valor > 0) ou padrão true
            var disponivel = true;
            if (idxDisponivel >= 0 && !string.IsNullOrWhiteSpace(disponivelStr))
            {
                var d = disponivelStr.Trim().ToUpperInvariant();
                disponivel = d is "S" or "SIM" or "1" or "TRUE" or "X" or "Y";
            }
            else if (idxEstoque >= 0 && !string.IsNullOrWhiteSpace(estoqueStr) && TryParseQuantidadeEstoque(estoqueStr, out var q) && q >= 0)
                disponivel = q > 0;

            var chaveCodigo = codigoBarras.ToUpperInvariant();
            var produtosDoCodigo = new List<Produto>();
            if (!string.IsNullOrWhiteSpace(chaveCodigo) && produtosPorCodigo.TryGetValue(chaveCodigo, out var encontrados))
                produtosDoCodigo = encontrados;
            var produto = produtosDoCodigo.FirstOrDefault();
            if (produto == null && options.SomenteEstoque)
            {
                result.ProdutosNaoEncontrados++;
                var idRef = string.IsNullOrWhiteSpace(codigoBarras) ? nome : codigoBarras;
                result.Pendencias.Add($"Linha {linhaNum}: produto '{idRef}' não encontrado para atualizar estoque.");
                continue;
            }

            if (produto == null && !options.CriarNovos)
            {
                result.ProdutosNaoEncontrados++;
                var idRef = string.IsNullOrWhiteSpace(codigoBarras) ? nome : codigoBarras;
                result.Pendencias.Add($"Linha {linhaNum}: produto novo '{idRef}' pendente de cadastro.");
                continue;
            }

            decimal precoVenda = 0;
            var temPrecoValido = TryParseDecimal(precoVendaStr, out precoVenda) && precoVenda >= 0;
            if ((produto == null || !options.SomenteEstoque) && !temPrecoValido)
            {
                result.LinhasIgnoradasPrecoInvalido++;
                result.Erros.Add($"Linha {linhaNum}: Preço de venda inválido.");
                continue;
            }

            if (produto != null)
            {
                var alvos = produtosDoCodigo.Count > 0 ? produtosDoCodigo : [produto];
                if (!options.SomenteEstoque)
                {
                    // Categoria: por nome; "(todas)" ou vazio = usar "Geral"
                    if (string.IsNullOrWhiteSpace(categoriaNome) || categoriaNome.Equals("(todas)", StringComparison.OrdinalIgnoreCase))
                        categoriaNome = "Geral";
                    if (!categoriasPorNome.TryGetValue(categoriaNome.ToUpperInvariant(), out var categoria))
                    {
                        categoria = new Categoria { Nome = categoriaNome };
                        _db.Categorias.Add(categoria);
                        await _db.SaveChangesAsync(ct);
                        categoriasPorNome[categoria.Nome.ToUpperInvariant()] = categoria;
                    }
                    foreach (var alvo in alvos)
                    {
                        // Não sobrescreve descricao/imagem no fluxo de importação.
                        alvo.Nome = nome;
                        alvo.Preco = precoVenda;
                        if (!string.IsNullOrWhiteSpace(codigoBarras))
                            alvo.Codigo = codigoBarras;
                        alvo.CategoriaId = categoria.Id;
                    }
                }
                foreach (var alvo in alvos)
                    alvo.Ativo = true;
                result.ProdutosAtualizados++;
            }
            else
            {
                if (string.IsNullOrWhiteSpace(categoriaNome) || categoriaNome.Equals("(todas)", StringComparison.OrdinalIgnoreCase))
                    categoriaNome = "Geral";
                if (!categoriasPorNome.TryGetValue(categoriaNome.ToUpperInvariant(), out var categoria))
                {
                    categoria = new Categoria { Nome = categoriaNome };
                    _db.Categorias.Add(categoria);
                    await _db.SaveChangesAsync(ct);
                    categoriasPorNome[categoria.Nome.ToUpperInvariant()] = categoria;
                }

                produto = new Produto
                {
                    Codigo = string.IsNullOrEmpty(codigoBarras) ? $"IMP-L{linhaNum}" : codigoBarras,
                    Nome = nome,
                    Descricao = null,
                    Preco = precoVenda,
                    CategoriaId = categoria.Id,
                    Ativo = true
                };
                _db.Produtos.Add(produto);
                await _db.SaveChangesAsync(ct);
                var novoKey = (produto.Codigo ?? "").ToUpperInvariant();
                if (!produtosPorCodigo.TryGetValue(novoKey, out var lista))
                {
                    lista = new List<Produto>();
                    produtosPorCodigo[novoKey] = lista;
                }
                lista.Add(produto);
                result.ProdutosCriados++;
                produtosDoCodigo = [produto];
            }

            // Disponibilidade: replicar para todas as lojas (admin pode ajustar depois por loja)
            var alvosEstoque = produtosDoCodigo.Count > 0 ? produtosDoCodigo : [produto];
            foreach (var alvo in alvosEstoque)
            {
                foreach (var loja in todasLojas)
                {
                    var pl = alvo.ProdutosLoja.FirstOrDefault(pl => pl.LojaId == loja.Id);
                    if (pl != null)
                        pl.Disponivel = disponivel;
                    else
                        _db.ProdutosLoja.Add(new ProdutoLoja { ProdutoId = alvo.Id, LojaId = loja.Id, Disponivel = disponivel });
                }
            }

            result.LinhasProcessadas++;
        }

        await _db.SaveChangesAsync(ct);
        return result;
    }

    /// <summary>
    /// Modo "Listagem de produtos": apenas vincula código (extraído de "77 - NOME") e categoria. Não cria produtos, não altera nome/preço/estoque.
    /// </summary>
    private async Task<ImportacaoCsvResult> ImportarApenasCodigoCategoriaAsync(
        List<List<string>> rows,
        int idxProduto,
        int idxCategoria,
        ImportacaoCsvResult result,
        CancellationToken ct)
    {
        if (idxCategoria < 0)
        {
            result.Erros.Add("Modo 'apenas código e categoria' exige coluna 'Categoria' no cabeçalho.");
            return result;
        }

        var categoriasPorNome = await _db.Categorias.ToDictionaryAsync(c => c.Nome.Trim().ToUpperInvariant(), c => c, StringComparer.OrdinalIgnoreCase);
        var produtosLista = await _db.Produtos.ToListAsync(ct);
        var produtosPorCodigo = new Dictionary<string, List<Produto>>(StringComparer.OrdinalIgnoreCase);
        foreach (var p in produtosLista)
        {
            var key = (p.Codigo ?? "").Trim();
            if (string.IsNullOrEmpty(key)) continue;
            if (!produtosPorCodigo.TryGetValue(key, out var lista))
            {
                lista = new List<Produto>();
                produtosPorCodigo[key] = lista;
            }
            lista.Add(p);
        }

        for (var i = 1; i < rows.Count; i++)
        {
            ct.ThrowIfCancellationRequested();
            var valores = rows[i];
            var linhaNum = i + 1;
            var nome = ObterValor(valores, idxProduto).Trim();
            if (nome.StartsWith("Totais do relatório", StringComparison.OrdinalIgnoreCase) ||
                nome.StartsWith("Totais do relatorio", StringComparison.OrdinalIgnoreCase))
                continue;
            if (string.IsNullOrWhiteSpace(nome))
            {
                result.LinhasIgnoradasNomeVazio++;
                continue;
            }

            if (!TryExtractCodigoDoNome(nome, out var codigo) || string.IsNullOrWhiteSpace(codigo))
            {
                result.Pendencias.Add($"Linha {linhaNum}: não foi possível extrair código do nome '{nome.Substring(0, Math.Min(50, nome.Length))}...' (esperado formato '77 - NOME').");
                continue;
            }

            var categoriaNome = ObterValor(valores, idxCategoria).Trim();
            if (PareceCodigoOuBarras(categoriaNome)) categoriaNome = "";
            if (string.IsNullOrWhiteSpace(categoriaNome) || categoriaNome.Equals("(todas)", StringComparison.OrdinalIgnoreCase))
                categoriaNome = "Geral";
            if (!categoriasPorNome.TryGetValue(categoriaNome.ToUpperInvariant(), out var categoria))
            {
                categoria = new Categoria { Nome = categoriaNome };
                _db.Categorias.Add(categoria);
                await _db.SaveChangesAsync(ct);
                categoriasPorNome[categoria.Nome.ToUpperInvariant()] = categoria;
            }

            var chaveCodigo = codigo.Trim();
            if (!produtosPorCodigo.TryGetValue(chaveCodigo, out var produtosDoCodigo))
            {
                result.ProdutosNaoEncontrados++;
                result.Pendencias.Add($"Linha {linhaNum}: produto com código '{codigo}' não encontrado. Importe primeiro a planilha de posição de estoque.");
                continue;
            }

            foreach (var alvo in produtosDoCodigo)
            {
                alvo.Codigo = chaveCodigo;
                alvo.CategoriaId = categoria.Id;
            }
            result.ProdutosAtualizados++;
            result.LinhasProcessadas++;
        }

        await _db.SaveChangesAsync(ct);
        return result;
    }

    /// <summary>
    /// Extrai o código interno do início do nome no formato "77 - CARREGADOR DE CELULAR" (número à esquerda do " - ").
    /// </summary>
    private static bool TryExtractCodigoDoNome(string nome, out string? codigo)
    {
        codigo = null;
        if (string.IsNullOrWhiteSpace(nome)) return false;
        var idx = nome.IndexOf(" - ", StringComparison.Ordinal);
        if (idx <= 0) return false;
        var part = nome.Substring(0, idx).Trim();
        if (string.IsNullOrEmpty(part) || !part.All(char.IsDigit)) return false;
        codigo = part;
        return true;
    }

    private static string ObterValor(List<string> valores, int indice)
    {
        if (indice < 0 || indice >= valores.Count) return "";
        return valores[indice];
    }

    /// <summary>
    /// Converte valor para decimal (pt-BR: 1.234,56 ou 56.000,00). Aceita vazio como 0, R$ e espaços.
    /// </summary>
    private static bool TryParseDecimal(string value, out decimal result)
    {
        result = 0;
        if (string.IsNullOrWhiteSpace(value)) return true; // vazio = 0
        value = value.Trim();
        // Remove R$ e qualquer outro texto antes/depois
        if (value.StartsWith("R$", StringComparison.OrdinalIgnoreCase))
            value = value.Substring(2).Trim();
        value = value.Trim();
        if (string.IsNullOrWhiteSpace(value)) return true;
        // pt-BR: ponto = milhar, vírgula = decimal → 56.000,00 ou 850 ou 0,01
        value = value.Replace(".", "").Replace(",", ".");
        return decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out result) && result >= 0;
    }

    /// <summary>
    /// Converte valor de quantidade/estoque para inteiro (pt-BR: 10,000 ou 1.987,000). Aceita vazio como 0, R$ e espaços.
    /// </summary>
    private static bool TryParseQuantidadeEstoque(string value, out int result)
    {
        result = 0;
        if (string.IsNullOrWhiteSpace(value)) return true;
        value = value.Trim();
        if (value.StartsWith("R$", StringComparison.OrdinalIgnoreCase))
            value = value.Substring(2).Trim();
        if (string.IsNullOrWhiteSpace(value)) return true;
        value = value.Replace(".", "").Replace(",", ".");
        if (!decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var d) || d < 0)
            return false;
        result = (int)Math.Max(0, d);
        return true;
    }

    /// <summary>
    /// Retorna o índice da coluna que corresponde a um dos nomes. A ordem de <paramref name="nomes"/> importa:
    /// o primeiro nome que bater em alguma coluna define a coluna (ex.: "Código de barras" antes de "Codigo").
    /// </summary>
    private static int ObterIndice(List<string> colunas, string[] nomes)
    {
        foreach (var n in nomes)
        {
            for (var i = 0; i < colunas.Count; i++)
            {
                if (colunas[i].Trim().Equals(n, StringComparison.OrdinalIgnoreCase))
                    return i;
            }
        }
        return -1;
    }

    /// <summary>
    /// Retorna o índice da coluna "Preço de venda", garantindo que não seja "Preço de custo" nem "Preço do fornecedor".
    /// </summary>
    private static int ObterIndicePrecoVenda(List<string> colunas)
    {
        for (var i = 0; i < colunas.Count; i++)
        {
            var nome = colunas[i].Trim();
            if (string.IsNullOrEmpty(nome)) continue;
            var upper = nome.ToUpperInvariant();
            if (upper.Contains("CUSTO") || upper.Contains("FORNECEDOR"))
                continue;
            foreach (var n in ColPrecoVenda)
            {
                if (nome.Equals(n, StringComparison.OrdinalIgnoreCase))
                    return i;
            }
            if (upper.Contains("VENDA"))
                return i;
        }
        return -1;
    }

    /// <summary>
    /// Indica se o texto parece código interno ou código de barras (não nome de categoria).
    /// </summary>
    private static bool PareceCodigoOuBarras(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > 20) return false;
        var s = value.Trim();
        // Só dígitos (EAN etc.)
        if (s.Length >= 8 && s.Length <= 14 && s.All(char.IsDigit)) return true;
        // Padrão tipo 00X0, 88X55, 40M CHUMBO
        var semEspaco = s.Replace(" ", "");
        if (semEspaco.Length >= 2 && semEspaco.All(c => char.IsDigit(c) || c == 'X' || c == 'x' || c == 'M' || c == 'm' || c == 'L' || c == 'l')) return true;
        // Número curto (38, 40, 60)
        if (s.Length <= 4 && s.All(char.IsDigit)) return true;
        // Padrão tipo 20L CANE 2F, 60M CHUMBO (tamanho + descrição)
        if (s.Any(char.IsDigit) && (s.Contains('M') || s.Contains('m') || s.Contains('L') || s.Contains('l'))) return true;
        return false;
    }

    private static char DetectCsvDelimiter(string line)
    {
        var semi = 0;
        var comma = 0;
        var tab = 0;
        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (c == ';') semi++;
            else if (c == ',') comma++;
            else if (c == '\t') tab++;
        }
        if (semi >= comma && semi >= tab) return ';';
        if (tab >= comma) return '\t';
        return ',';
    }

    private static List<string> ParseCsvLine(string line, char delimiter, bool usaAspas = true)
    {
        var list = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;
        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (usaAspas && c == '"')
            {
                inQuotes = !inQuotes;
                continue;
            }
            if (!inQuotes && c == delimiter)
            {
                list.Add(current.ToString().Trim());
                current.Clear();
                continue;
            }
            current.Append(c);
        }
        list.Add(current.ToString().Trim());
        return list;
    }
}
