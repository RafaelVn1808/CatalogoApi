using System.ComponentModel.DataAnnotations;

namespace CatalagoApi.Models.DTOs;

public record ProdutoListDto(
    int Id,
    string Nome,
    string? Descricao,
    decimal Preco,
    string? ImagemUrl,
    string? Codigo,
    bool Ativo,
    string CategoriaNome,
    IEnumerable<DisponibilidadeLojaDto> LojasDisponiveis
);

public record ProdutoDetalheDto(
    int Id,
    string Nome,
    string? Descricao,
    decimal Preco,
    string? ImagemUrl,
    string? Codigo,
    CategoriaDto Categoria,
    IEnumerable<DisponibilidadeLojaDto> LojasDisponiveis
);

public record ProdutoCreateDto(
    [Required(ErrorMessage = "Nome é obrigatório")]
    [MinLength(1)]
    [MaxLength(200)]
    string Nome,
    [MaxLength(2000)]
    string? Descricao,
    [Range(0, double.MaxValue, ErrorMessage = "Preço deve ser maior ou igual a zero")]
    decimal Preco,
    [MaxLength(50)]
    string? Codigo,
    [Range(1, int.MaxValue, ErrorMessage = "Categoria inválida")]
    int CategoriaId,
    IEnumerable<EstoqueLojaDto>? Estoques
);

public record ProdutoUpdateDto(
    [Required(ErrorMessage = "Nome é obrigatório")]
    [MinLength(1)]
    [MaxLength(200)]
    string Nome,
    [MaxLength(2000)]
    string? Descricao,
    [Range(0, double.MaxValue, ErrorMessage = "Preço deve ser maior ou igual a zero")]
    decimal Preco,
    [MaxLength(500)]
    string? ImagemUrl,
    [MaxLength(50)]
    string? Codigo,
    bool Ativo,
    [Range(1, int.MaxValue, ErrorMessage = "Categoria inválida")]
    int CategoriaId
);

public record ProdutoAtivoDto(bool Ativo);

public record DisponibilidadeLojaDto(int LojaId, string LojaNome, string? LojaWhatsApp, bool Disponivel);

public record EstoqueLojaDto(
    [Range(1, int.MaxValue, ErrorMessage = "LojaId inválido")]
    int LojaId,
    bool Disponivel
);

/// <summary>
/// Resposta da listagem de produtos com paginação e preço médio do resultado filtrado.
/// </summary>
public record ProdutoListarResponse(
    IEnumerable<ProdutoListDto> Itens,
    int Total,
    int Pagina,
    int Tamanho,
    int TotalPaginas,
    decimal? PrecoMedio
);
