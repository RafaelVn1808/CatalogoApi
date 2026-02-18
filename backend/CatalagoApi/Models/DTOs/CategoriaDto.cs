using System.ComponentModel.DataAnnotations;

namespace CatalagoApi.Models.DTOs;

public record CategoriaDto(int Id, string Nome, string? Descricao);

public record CategoriaCreateDto(
    [Required(ErrorMessage = "Nome é obrigatório")]
    [MinLength(1)]
    [MaxLength(100)]
    string Nome,
    [MaxLength(500)]
    string? Descricao
);

public record CategoriaUpdateDto(
    [Required(ErrorMessage = "Nome é obrigatório")]
    [MinLength(1)]
    [MaxLength(100)]
    string Nome,
    [MaxLength(500)]
    string? Descricao
);
