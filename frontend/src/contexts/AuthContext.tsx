/**
 * AuthContext: estado global de autenticação.
 * - user: dados do usuário logado (nome, email, role, lojaId) ou null
 * - login(email, senha): chama POST /api/v1/auth/login, persiste tokens no localStorage, atualiza user
 * - logout(): remove tokens e user
 * - refresh(): não exposto; o interceptor do api client usa o refresh token em 401
 * - setAuthHelpers: repassa getters/setters para o api client (interceptors)
 *
 * Tokens armazenados em localStorage (accessToken, refreshToken, expiresAt) para persistir entre recarregamentos.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setAuthHelpers } from '@/api/client'
import type { TokenResponse } from '@/types/api'

const STORAGE_KEYS = {
  access: 'catalago_access',
  refresh: 'catalago_refresh',
  expires: 'catalago_expires',
  user: 'catalago_user',
} as const

interface User {
  nome: string
  email: string
  role: string
  lojaId: number | null
  deveAlterarSenha: boolean
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, senha: string) => Promise<{ ok: boolean; message?: string }>
  logout: () => void
  clearDeveAlterarSenha: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const getAccessToken = useCallback(() => localStorage.getItem(STORAGE_KEYS.access), [])
  const getRefreshToken = useCallback(() => localStorage.getItem(STORAGE_KEYS.refresh), [])

  const setTokens = useCallback((access: string, refresh: string, expiresAt: string) => {
    localStorage.setItem(STORAGE_KEYS.access, access)
    localStorage.setItem(STORAGE_KEYS.refresh, refresh)
    localStorage.setItem(STORAGE_KEYS.expires, expiresAt)
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.access)
    localStorage.removeItem(STORAGE_KEYS.refresh)
    localStorage.removeItem(STORAGE_KEYS.expires)
    localStorage.removeItem(STORAGE_KEYS.user)
    setUser(null)
  }, [])

  useEffect(() => {
    setAuthHelpers({
      getAccessToken,
      getRefreshToken,
      setTokens,
      clearAuth,
    })
  }, [getAccessToken, getRefreshToken, setTokens, clearAuth])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.user)
    const access = localStorage.getItem(STORAGE_KEYS.access)
    if (stored && access) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        clearAuth()
      }
    }
    setLoading(false)
  }, [clearAuth])

  const login = useCallback(
    async (email: string, senha: string): Promise<{ ok: boolean; message?: string }> => {
      try {
        const { data } = await api.post<TokenResponse>('/api/v1/auth/login', { email, senha })
        localStorage.setItem(STORAGE_KEYS.access, data.accessToken)
        localStorage.setItem(STORAGE_KEYS.refresh, data.refreshToken)
        localStorage.setItem(STORAGE_KEYS.expires, data.expiresAt)
        const u: User = {
          nome: data.nome,
          email: data.email,
          role: data.role,
          lojaId: data.lojaId ?? null,
          deveAlterarSenha: data.deveAlterarSenha ?? false,
        }
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(u))
        setUser(u)
        return { ok: true }
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erro ao fazer login.'
        return { ok: false, message: msg }
      }
    },
    []
  )

  const logout = useCallback(() => {
    clearAuth()
  }, [clearAuth])

  const clearDeveAlterarSenha = useCallback(() => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, deveAlterarSenha: false }
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(updated))
      return updated
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, clearDeveAlterarSenha }),
    [user, loading, login, logout, clearDeveAlterarSenha]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
