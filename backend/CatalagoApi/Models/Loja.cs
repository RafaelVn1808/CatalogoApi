namespace CatalagoApi.Models;

public class Loja
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string? Endereco { get; set; }
    public string? Telefone { get; set; }
    public string? WhatsApp { get; set; }
    public string? Horario { get; set; }

    public ICollection<ProdutoLoja> ProdutosLoja { get; set; } = [];
    public ICollection<Usuario> Usuarios { get; set; } = [];
}
