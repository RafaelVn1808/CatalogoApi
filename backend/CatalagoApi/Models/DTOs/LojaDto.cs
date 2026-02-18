using System.ComponentModel.DataAnnotations;

namespace CatalagoApi.Models.DTOs;

public record LojaDto(
    int Id,
    string Nome,
    string? Endereco,
    string? Telefone,
    string? WhatsApp,
    string? Horario
);

public record LojaCreateDto(
    [Required(ErrorMessage = "Nome é obrigatório")]
    [MinLength(1)]
    [MaxLength(200)]
    string Nome,
    [MaxLength(500)]
    string? Endereco,
    [MaxLength(20)]
    string? Telefone,
    [MaxLength(20)]
    string? WhatsApp,
    [MaxLength(200)]
    string? Horario
);

public record LojaUpdateDto(
    [Required(ErrorMessage = "Nome é obrigatório")]
    [MinLength(1)]
    [MaxLength(200)]
    string Nome,
    [MaxLength(500)]
    string? Endereco,
    [MaxLength(20)]
    string? Telefone,
    [MaxLength(20)]
    string? WhatsApp,
    [MaxLength(200)]
    string? Horario
);
