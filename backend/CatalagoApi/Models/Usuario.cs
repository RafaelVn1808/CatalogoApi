namespace CatalagoApi.Models;

public class Usuario
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string SenhaHash { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string Role { get; set; } = "Admin"; // Admin, GerenteLoja
    public int? LojaId { get; set; }

    public bool DeveAlterarSenha { get; set; }

    /// <summary>Token para redefinição de senha (gerado em recuperar-senha).</summary>
    public string? TokenRedefinicao { get; set; }
    public DateTime? TokenRedefinicaoExpira { get; set; }

    public Loja? Loja { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
