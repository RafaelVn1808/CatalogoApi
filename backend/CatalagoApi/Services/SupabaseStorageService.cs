using System.Net.Http.Headers;
using Microsoft.Extensions.Logging;

namespace CatalagoApi.Services;

public class SupabaseStorageService
{
    private readonly HttpClient _http;
    private readonly SupabaseSettings _settings;
    private readonly ILogger<SupabaseStorageService> _logger;

    public SupabaseStorageService(HttpClient http, Microsoft.Extensions.Options.IOptions<SupabaseSettings> settings, ILogger<SupabaseStorageService> logger)
    {
        _http = http;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<(string? Url, string? Error)> UploadAsync(Stream fileStream, string fileName, string contentType, CancellationToken ct = default)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var validExt = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        if (!validExt.Contains(ext))
            return (null, "Extensão inválida");

        var uniqueName = $"{Guid.NewGuid()}{ext}";
        var bucket = _settings.Bucket;
        var path = $"produtos/{uniqueName}";
        var uploadUrl = $"{_settings.Url.TrimEnd('/')}/storage/v1/object/{bucket}/{path}";

        using var content = new StreamContent(fileStream);
        content.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        using var request = new HttpRequestMessage(HttpMethod.Post, uploadUrl) { Content = content };
        request.Headers.Add("Authorization", $"Bearer {_settings.ServiceKey}");
        request.Headers.Add("apikey", _settings.ServiceKey);

        var response = await _http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("Supabase Storage upload failed. Status: {Status}, Response: {Response}", response.StatusCode, errorBody);
            return (null, $"[{(int)response.StatusCode}] {errorBody}");
        }

        var publicUrl = $"{_settings.Url.TrimEnd('/')}/storage/v1/object/public/{bucket}/{path}";
        return (publicUrl, null);
    }
}

public class SupabaseSettings
{
    public const string SectionName = "Supabase";
    public string Url { get; set; } = string.Empty;
    public string ServiceKey { get; set; } = string.Empty;
    public string Bucket { get; set; } = "Imagens-produtos";
}
