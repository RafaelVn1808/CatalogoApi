namespace CatalagoApi.Models;

public class ProdutoLoja
{
    public int ProdutoId { get; set; }
    public Produto Produto { get; set; } = null!;

    public int LojaId { get; set; }
    public Loja Loja { get; set; } = null!;

    /// <summary>Indica se o produto está disponível para venda nesta loja (admin controla sem usar quantidade).</summary>
    public bool Disponivel { get; set; }
}
