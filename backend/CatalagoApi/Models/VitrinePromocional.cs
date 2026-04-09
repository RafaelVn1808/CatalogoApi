namespace CatalagoApi.Models;

public class VitrinePromocional
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public bool Ativa { get; set; } = true;
    public DateTime? DataInicio { get; set; }
    public DateTime? DataFim { get; set; }
    public int AutoPlayMs { get; set; } = 4000;

    public ICollection<VitrinePromocionalItem> Itens { get; set; } = [];
}
