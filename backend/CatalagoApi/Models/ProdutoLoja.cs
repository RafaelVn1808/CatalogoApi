namespace CatalagoApi.Models;

public class ProdutoLoja
{
    public int ProdutoId { get; set; }
    public Produto Produto { get; set; } = null!;

    public int LojaId { get; set; }
    public Loja Loja { get; set; } = null!;

    public int Quantidade { get; set; }
}
