using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using CatalagoApi.Data;
using CatalagoApi.Models;
using Microsoft.EntityFrameworkCore;

namespace CatalagoApi.Services;

public class ImportacaoCsvResult
{
    public int LinhasProcessadas { get; set; }
    public int ProdutosCriados { get; set; }
    public int ProdutosAtualizados { get; set; }
    public IList<string> Erros { get; } = new List<string>();
    public bool Sucesso => Erros.Count == 0;
}

/// <summary>
/// Importa produtos a partir de CSV ou XLSX com o modelo de colunas:
/// #, Produto, Código de barras, Categoria, Marca, Estoque, Preço do fornecedor, Preço de custo, Preço de venda
/// </summary>
public class ImportacaoCsvService
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");
    private readonly AppDbContext _db;

    // Nomes de colunas aceitos (cabeçalho do arquivo)
    private static readonly string[] ColProduto = ["Produto", "produto", "Nome", "nome"];
    private static readonly string[] ColCodigoBarras = ["Código de barras", "Codigo de barras", "codigo de barras", "Codigo", "codigo", "Código", "código"];
    private static readonly string[] ColCategoria = ["Categoria", "categoria"];
    private static readonly string[] ColMarca = ["Marca", "marca"];
    private static readonly string[] ColEstoque = ["Estoque", "estoque"];
    private static readonly string[] ColPrecoVenda = ["Preço de venda", "Preco de venda", "preco de venda", "Preço", "Preco", "preco"];

    public ImportacaoCsvService(AppDbContext db) => _db = db;

    /// <summary>
    /// Importa a partir de um stream CSV (separador ; ou ,). Primeira linha = cabeçalho.
    /// </summary>
    public async Task<ImportacaoCsvResult> ImportarCsvAsync(Stream csvStream, CancellationToken ct = default)
    {
        var rows = new List<List<string>>();
        using var reader = new StreamReader(csvStream, Encoding.UTF8);
        string? line;
        while ((line = await reader.ReadLineAsync(ct)) != null)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            rows.Add(ParseCsvLine(line));
        }
        return await ImportarDeLinhasAsync(rows, ct);
    }

    /// <summary>
    /// Importa a partir de um stream XLSX. Usa a primeira planilha; primeira linha = cabeçalho.
    /// </summary>
    public async Task<ImportacaoCsvResult> ImportarXlsxAsync(Stream xlsxStream, CancellationToken ct = default)
    {
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
        return await ImportarDeLinhasAsync(rows, ct);
    }

    private async Task<ImportacaoCsvResult> ImportarDeLinhasAsync(List<List<string>> rows, CancellationToken ct)
    {
        var result = new ImportacaoCsvResult();
        if (rows.Count == 0)
        {
            result.Erros.Add("Arquivo sem linhas.");
            return result;
        }

        var header = rows[0];
        var idxProduto = ObterIndice(header, ColProduto);
        var idxCodigo = ObterIndice(header, ColCodigoBarras);
        var idxCategoria = ObterIndice(header, ColCategoria);
        var idxMarca = ObterIndice(header, ColMarca);
        var idxEstoque = ObterIndice(header, ColEstoque);
        var idxPrecoVenda = ObterIndice(header, ColPrecoVenda);

        if (idxProduto < 0 || idxPrecoVenda < 0)
        {
            result.Erros.Add("Cabeçalho deve conter ao menos: 'Produto' e 'Preço de venda'. Colunas esperadas: #, Produto, Código de barras, Categoria, Marca, Estoque, Preço do fornecedor, Preço de custo, Preço de venda.");
            return result;
        }

        var categoriasPorNome = await _db.Categorias.ToDictionaryAsync(c => c.Nome.Trim().ToUpperInvariant(), c => c, StringComparer.OrdinalIgnoreCase);
        var primeiraLoja = await _db.Lojas.OrderBy(l => l.Id).FirstOrDefaultAsync(ct);
        var produtosPorCodigo = await _db.Produtos.Include(p => p.ProdutosLoja).ToDictionaryAsync(p => (p.Codigo ?? "").Trim().ToUpperInvariant(), p => p, StringComparer.OrdinalIgnoreCase);

        for (var i = 1; i < rows.Count; i++)
        {
            ct.ThrowIfCancellationRequested();
            var valores = rows[i];
            var linhaNum = i + 1;

            var nome = ObterValor(valores, idxProduto).Trim();
            if (string.IsNullOrEmpty(nome))
            {
                result.Erros.Add($"Linha {linhaNum}: Produto (nome) é obrigatório.");
                continue;
            }

            if (!TryParseDecimal(ObterValor(valores, idxPrecoVenda), out var precoVenda) || precoVenda < 0)
            {
                result.Erros.Add($"Linha {linhaNum}: Preço de venda inválido.");
                continue;
            }

            var codigoBarras = ObterValor(valores, idxCodigo).Trim();
            var categoriaNome = ObterValor(valores, idxCategoria).Trim();
            var marca = ObterValor(valores, idxMarca).Trim();
            var estoqueStr = ObterValor(valores, idxEstoque).Trim();

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

            var descricao = string.IsNullOrWhiteSpace(marca) ? null : $"Marca: {marca}";
            var quantidade = 0;
            if (!string.IsNullOrWhiteSpace(estoqueStr) && int.TryParse(estoqueStr.Replace(".", ""), NumberStyles.Integer, PtBr, out var q) && q >= 0)
                quantidade = q;

            var chaveCodigo = (string.IsNullOrEmpty(codigoBarras) ? $"IMP-L{linhaNum}" : codigoBarras).ToUpperInvariant();
            var produto = produtosPorCodigo.GetValueOrDefault(chaveCodigo);

            if (produto != null)
            {
                produto.Nome = nome;
                produto.Descricao = descricao;
                produto.Preco = precoVenda;
                produto.CategoriaId = categoria.Id;
                produto.Codigo = string.IsNullOrEmpty(codigoBarras) ? produto.Codigo : codigoBarras;
                produto.Ativo = true;
                result.ProdutosAtualizados++;
            }
            else
            {
                produto = new Produto
                {
                    Codigo = string.IsNullOrEmpty(codigoBarras) ? $"IMP-L{linhaNum}" : codigoBarras,
                    Nome = nome,
                    Descricao = descricao,
                    Preco = precoVenda,
                    CategoriaId = categoria.Id,
                    Ativo = true
                };
                _db.Produtos.Add(produto);
                await _db.SaveChangesAsync(ct);
                produtosPorCodigo[(produto.Codigo ?? "").ToUpperInvariant()] = produto;
                result.ProdutosCriados++;
            }

            // Estoque: vincular à primeira loja, se existir
            if (primeiraLoja != null)
            {
                var pl = produto.ProdutosLoja.FirstOrDefault(pl => pl.LojaId == primeiraLoja.Id);
                if (pl != null)
                    pl.Quantidade = quantidade;
                else
                    _db.ProdutosLoja.Add(new ProdutoLoja { ProdutoId = produto.Id, LojaId = primeiraLoja.Id, Quantidade = quantidade });
            }

            result.LinhasProcessadas++;
        }

        await _db.SaveChangesAsync(ct);
        return result;
    }

    private static string ObterValor(List<string> valores, int indice)
    {
        if (indice < 0 || indice >= valores.Count) return "";
        return valores[indice];
    }

    private static bool TryParseDecimal(string value, out decimal result)
    {
        result = 0;
        if (string.IsNullOrWhiteSpace(value)) return false;
        value = value.Trim().Replace(".", "").Replace(",", ".");
        return decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out result);
    }

    private static int ObterIndice(List<string> colunas, string[] nomes)
    {
        for (var i = 0; i < colunas.Count; i++)
        {
            var c = colunas[i].Trim();
            foreach (var n in nomes)
                if (c.Equals(n, StringComparison.OrdinalIgnoreCase))
                    return i;
        }
        return -1;
    }

    private static List<string> ParseCsvLine(string line)
    {
        var list = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;
        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (c == '"')
            {
                inQuotes = !inQuotes;
                continue;
            }
            if (!inQuotes && (c == ';' || c == ','))
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
