using System.Net;
using System.Text.Json;

namespace CatalagoApi.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger, IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro não tratado: {Message}", ex.Message);
            await EscreverRespostaErroAsync(context, ex);
        }
    }

    private async Task EscreverRespostaErroAsync(HttpContext context, Exception ex)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, mensagem) = ex switch
        {
            ArgumentException => (HttpStatusCode.BadRequest, ex.Message),
            KeyNotFoundException => (HttpStatusCode.NotFound, ex.Message),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "Não autorizado."),
            _ => (HttpStatusCode.InternalServerError, _env.IsDevelopment() ? ex.Message : "Ocorreu um erro interno.")
        };

        context.Response.StatusCode = (int)statusCode;

        var body = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase) { ["message"] = mensagem };
        if (_env.IsDevelopment() && ex.StackTrace != null)
            body["detail"] = ex.StackTrace;

        var json = JsonSerializer.Serialize(body, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await context.Response.WriteAsync(json);
    }
}
