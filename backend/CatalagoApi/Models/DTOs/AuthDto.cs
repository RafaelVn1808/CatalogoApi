using System.ComponentModel.DataAnnotations;

namespace CatalagoApi.Models.DTOs;

public record LoginRequest(
    [Required(ErrorMessage = "Email é obrigatório")]
    [EmailAddress(ErrorMessage = "Email inválido")]
    string Email,
    [Required(ErrorMessage = "Senha é obrigatória")]
    [MinLength(6, ErrorMessage = "Senha deve ter no mínimo 6 caracteres")]
    string Senha
);

public record LoginResponse(string Token, string Nome, string Email, string Role, int? LojaId);

/// <summary>Request para renovar o token usando o refresh token.</summary>
public record RefreshTokenRequest(
    [Required(ErrorMessage = "Refresh token é obrigatório")]
    string RefreshToken
);

/// <summary>Resposta do login/refresh com access token e refresh token.</summary>
public record TokenResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    string Nome,
    string Email,
    string Role,
    int? LojaId
);

/// <summary>Alterar senha (usuário autenticado).</summary>
public record AlterarSenhaRequest(
    [Required(ErrorMessage = "Senha atual é obrigatória")]
    string SenhaAtual,
    [Required(ErrorMessage = "Nova senha é obrigatória")]
    [MinLength(6, ErrorMessage = "Nova senha deve ter no mínimo 6 caracteres")]
    string NovaSenha
);

/// <summary>Solicitar recuperação de senha (envia link/token por email).</summary>
public record RecuperarSenhaRequest(
    [Required(ErrorMessage = "Email é obrigatório")]
    [EmailAddress(ErrorMessage = "Email inválido")]
    string Email
);

/// <summary>Redefinir senha usando o token enviado por email.</summary>
public record RedefinirSenhaRequest(
    [Required(ErrorMessage = "Token é obrigatório")]
    string Token,
    [Required(ErrorMessage = "Email é obrigatório")]
    [EmailAddress(ErrorMessage = "Email inválido")]
    string Email,
    [Required(ErrorMessage = "Nova senha é obrigatória")]
    [MinLength(6, ErrorMessage = "Nova senha deve ter no mínimo 6 caracteres")]
    string NovaSenha
);
