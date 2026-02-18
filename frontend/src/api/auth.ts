/**
 * Chamadas à API de autenticação.
 */

import { api } from './client'
import type {
  TokenResponse,
  AlterarSenhaRequest,
  RecuperarSenhaRequest,
  RedefinirSenhaRequest,
} from '@/types/api'

export const authApi = {
  login: (email: string, senha: string) =>
    api.post<TokenResponse>('/api/v1/auth/login', { email, senha }),

  refresh: (refreshToken: string) =>
    api.post<TokenResponse>('/api/v1/auth/refresh', { refreshToken }),

  alterarSenha: (body: AlterarSenhaRequest) =>
    api.post('/api/v1/auth/alterar-senha', body),

  recuperarSenha: (body: RecuperarSenhaRequest) =>
    api.post<{ message?: string; token?: string }>('/api/v1/auth/recuperar-senha', body),

  redefinirSenha: (body: RedefinirSenhaRequest) =>
    api.post('/api/v1/auth/redefinir-senha', body),
}
