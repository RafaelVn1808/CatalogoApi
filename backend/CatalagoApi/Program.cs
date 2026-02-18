using System.Text;
using CatalagoApi.Data;
using CatalagoApi.HealthChecks;
using Microsoft.OpenApi.Models;
using CatalagoApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// User Secrets em desenvolvimento (credenciais Supabase, etc.)
if (builder.Environment.IsDevelopment())
    builder.Configuration.AddUserSecrets<Program>();

// Banco de dados
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// JWT
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));
builder.Services.Configure<SupabaseSettings>(builder.Configuration.GetSection(SupabaseSettings.SectionName));

var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>();
if (!string.IsNullOrEmpty(jwtSettings?.Key))
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidAudience = jwtSettings.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key))
            };
        });
}

builder.Services.AddAuthorization();

// Serviços
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ProdutoService>();
builder.Services.AddScoped<CategoriaService>();
builder.Services.AddScoped<LojaService>();
builder.Services.AddScoped<EstoqueService>();
builder.Services.AddScoped<ImportacaoCsvService>();
builder.Services.AddScoped<UploadService>();
builder.Services.AddHttpClient<SupabaseStorageService>();

// CORS (inclui origem do Swagger para evitar "Failed to fetch")
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000", "http://localhost:5000", "http://localhost:5173", "http://localhost:5291", "https://localhost:7171"];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Health checks
builder.Services.AddHealthChecks()
    .AddCheck<DbHealthCheck>("database", tags: ["db", "ready"])
    .AddCheck("self", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy(), tags: ["live"]);

// Rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
    {
        var key = ctx.User.Identity?.IsAuthenticated == true
            ? $"user:{ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "anon"}"
            : $"ip:{ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";
        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100,
            Window = TimeSpan.FromMinutes(1)
        });
    });
    options.OnRejected = async (ctx, ct) =>
    {
        ctx.HttpContext.Response.StatusCode = 429;
        await ctx.HttpContext.Response.WriteAsJsonAsync(new { message = "Muitas requisições. Tente novamente em instantes." }, ct);
    };
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "CatalagoApi", Version = "v1" });
    // Usa URL relativa para que o Try-it-out use a mesma origem da página (evita "Failed to fetch" por CORS)
    c.AddServer(new OpenApiServer { Url = "/", Description = "Servidor atual" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Name = "Authorization",
        Description = "Faça login em POST /api/v1/auth/login e cole APENAS o token (sem Bearer)"
    });
    c.OperationFilter<CatalagoApi.Swagger.BearerAuthOperationFilter>();
});

var app = builder.Build();

// Log do ambiente no startup (ajuda a debugar Swagger 404)
app.Logger.LogInformation("Ambiente: {Env}", app.Environment.EnvironmentName);

// Tratamento global de exceções
app.UseMiddleware<CatalagoApi.Middleware.ExceptionHandlingMiddleware>();

// Swagger ANTES do logging para que /swagger/* seja atendido pelo próprio Swagger
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "CatalagoApi v1");
    c.RoutePrefix = "swagger";
    c.DisplayRequestDuration();
});

app.UseMiddleware<CatalagoApi.Middleware.RequestLoggingMiddleware>();

// Migrations automáticas e seed em desenvolvimento
if (app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var pending = await db.Database.GetPendingMigrationsAsync();
        if (pending.Any())
            await db.Database.MigrateAsync();
        await DbSeeder.SeedAsync(db);
    }
}

// Garante schema de TokenRedefinicao e RefreshTokens (útil quando migração não foi aplicada)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE "Usuarios" ADD COLUMN IF NOT EXISTS "TokenRedefinicao" text NULL;
            ALTER TABLE "Usuarios" ADD COLUMN IF NOT EXISTS "TokenRedefinicaoExpira" timestamp with time zone NULL;
            """);
    }
    catch { /* colunas já existem */ }
    try
    {
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS "RefreshTokens" (
                "Id" serial PRIMARY KEY,
                "UsuarioId" integer NOT NULL REFERENCES "Usuarios"("Id") ON DELETE CASCADE,
                "Token" text NOT NULL,
                "ExpiresAt" timestamp with time zone NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL
            );
            CREATE INDEX IF NOT EXISTS "IX_RefreshTokens_ExpiresAt" ON "RefreshTokens"("ExpiresAt");
            CREATE INDEX IF NOT EXISTS "IX_RefreshTokens_Token" ON "RefreshTokens"("Token");
            CREATE INDEX IF NOT EXISTS "IX_RefreshTokens_UsuarioId" ON "RefreshTokens"("UsuarioId");
            """);
    }
    catch { /* tabela/índices já existem */ }
}

// Em desenvolvimento, evita redirecionar HTTP→HTTPS (evita "Failed to fetch" no Swagger)
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions { Predicate = _ => true });
app.MapHealthChecks("/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions { Predicate = c => c.Tags.Contains("ready") });
app.MapHealthChecks("/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions { Predicate = c => c.Tags.Contains("live") });

app.Run();

public partial class Program { }
