using CatalagoApi.Data;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace CatalagoApi.HealthChecks;

public class DbHealthCheck : IHealthCheck
{
    private readonly AppDbContext _db;

    public DbHealthCheck(AppDbContext db) => _db = db;

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            if (await _db.Database.CanConnectAsync(ct))
                return HealthCheckResult.Healthy("PostgreSQL conectado.");
            return HealthCheckResult.Unhealthy("Não foi possível conectar ao PostgreSQL.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Erro ao verificar PostgreSQL.", ex);
        }
    }
}
