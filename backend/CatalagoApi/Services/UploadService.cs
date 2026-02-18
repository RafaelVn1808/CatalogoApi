namespace CatalagoApi.Services;

/// <summary>
/// Serviço de upload de imagens com validação de tipo e tamanho.
/// </summary>
public class UploadService
{
    private readonly SupabaseStorageService _storage;

    private static readonly HashSet<string> TiposPermitidos = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpg",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp"
    };

    private const long TamanhoMaximoBytes = 5 * 1024 * 1024; // 5 MB

    public UploadService(SupabaseStorageService storage) => _storage = storage;

    /// <summary>
    /// Valida e envia a imagem para o storage. Tipos aceitos: image/jpg, image/jpeg, image/png, image/gif, image/webp. Tamanho máximo: 5 MB.
    /// </summary>
    /// <returns>URL pública da imagem em caso de sucesso; caso contrário (null, mensagem de erro).</returns>
    public async Task<(string? Url, string? Erro)> UploadImagemProdutoAsync(
        Stream stream,
        long tamanhoBytes,
        string fileName,
        string contentType,
        CancellationToken ct = default)
    {
        if (tamanhoBytes <= 0)
            return (null, "Arquivo vazio");

        if (tamanhoBytes > TamanhoMaximoBytes)
            return (null, "Arquivo muito grande. Máximo 5MB");

        var contentTypeNormalizado = contentType?.Trim().ToLowerInvariant() ?? "";
        if (!TiposPermitidos.Contains(contentTypeNormalizado))
            return (null, "Tipo de arquivo não permitido. Use JPG, JPEG, PNG, GIF ou WebP");

        var (url, error) = await _storage.UploadAsync(stream, fileName, contentTypeNormalizado, ct);
        if (url == null)
            return (null, error ?? "Falha ao fazer upload da imagem");

        return (url, null);
    }
}
