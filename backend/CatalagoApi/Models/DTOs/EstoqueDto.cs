namespace CatalagoApi.Models.DTOs;

public record EstoqueItemDto(
    int ProdutoId,
    string ProdutoNome,
    string? ProdutoCodigo,
    int LojaId,
    string LojaNome,
    int Quantidade
);
