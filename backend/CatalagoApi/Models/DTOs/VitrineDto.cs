using System.ComponentModel.DataAnnotations;

namespace CatalagoApi.Models.DTOs;

public record VitrineItemDto(
    int Id,
    int VitrineId,
    int? ProdutoId,
    string? ProdutoNome,
    string ImagemUrl,
    string? Titulo,
    string? Subtitulo,
    string? LinkUrl,
    int Ordem,
    bool Ativo
);

public record VitrineDto(
    int Id,
    string Nome,
    bool Ativa,
    DateTime? DataInicio,
    DateTime? DataFim,
    int AutoPlayMs,
    IEnumerable<VitrineItemDto> Itens
);

public record VitrineCreateDto(
    [Required(ErrorMessage = "Nome é obrigatório")]
    [MaxLength(200)]
    string Nome,
    bool Ativa = true,
    DateTime? DataInicio = null,
    DateTime? DataFim = null,
    int AutoPlayMs = 4000
);

public record VitrineUpdateDto(
    [Required(ErrorMessage = "Nome é obrigatório")]
    [MaxLength(200)]
    string Nome,
    bool Ativa,
    DateTime? DataInicio,
    DateTime? DataFim,
    int AutoPlayMs
);

public record VitrineItemCreateDto(
    [Required(ErrorMessage = "ImagemUrl é obrigatória")]
    string ImagemUrl,
    int? ProdutoId = null,
    [MaxLength(200)]
    string? Titulo = null,
    [MaxLength(400)]
    string? Subtitulo = null,
    [MaxLength(500)]
    string? LinkUrl = null,
    int Ordem = 0,
    bool Ativo = true
);

public record VitrineItemUpdateDto(
    [Required(ErrorMessage = "ImagemUrl é obrigatória")]
    string ImagemUrl,
    int? ProdutoId,
    [MaxLength(200)]
    string? Titulo,
    [MaxLength(400)]
    string? Subtitulo,
    [MaxLength(500)]
    string? LinkUrl,
    int Ordem,
    bool Ativo
);
