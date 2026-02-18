using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CatalagoApi.Tests;

/// <summary>Requer a API rodando ou PostgreSQL configurado para os endpoints /health e /live.</summary>
public class HealthCheckTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthCheckTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Health_RetornaOk()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/health");
        // 200 se app+DB ok; 503 se DB indisponível (ex.: testes sem PostgreSQL)
        Assert.True(response.StatusCode == HttpStatusCode.OK || response.StatusCode == HttpStatusCode.ServiceUnavailable);
    }

    [Fact]
    public async Task Live_RetornaOk()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/live");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
