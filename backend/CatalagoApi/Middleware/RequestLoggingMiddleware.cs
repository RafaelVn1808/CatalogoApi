namespace CatalagoApi.Middleware;

public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var method = context.Request.Method;
        var path = context.Request.Path;
        var start = DateTime.UtcNow;

        await _next(context);

        var elapsed = (DateTime.UtcNow - start).TotalMilliseconds;
        _logger.LogInformation("{Method} {Path} responded {StatusCode} in {Elapsed:F0} ms",
            method, path, context.Response.StatusCode, elapsed);
    }
}
