namespace CatalagoApi.Models;

public class VitrinePromocionalItem
{
    public int Id { get; set; }
    public int VitrineId { get; set; }
    public VitrinePromocional Vitrine { get; set; } = null!;

    public int? ProdutoId { get; set; }
    public Produto? Produto { get; set; }

    public string ImagemUrl { get; set; } = string.Empty;
    public string? Titulo { get; set; }
    public string? Subtitulo { get; set; }
    public string? LinkUrl { get; set; }
    public int Ordem { get; set; } = 0;
    public bool Ativo { get; set; } = true;
}
