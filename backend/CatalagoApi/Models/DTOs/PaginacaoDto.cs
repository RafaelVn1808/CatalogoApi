namespace CatalagoApi.Models.DTOs;

public record PaginacaoRequest(int Pagina = 1, int Tamanho = 20);

public record PaginacaoResponse<T>(
    IEnumerable<T> Itens,
    int Total,
    int Pagina,
    int Tamanho,
    int TotalPaginas
);
