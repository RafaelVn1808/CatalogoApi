/**
 * Cliente HTTP (axios) para a CatalagoApi.
 * - Base URL via VITE_API_URL ou proxy no dev (/api -> backend)
 * - Interceptor: envia Authorization Bearer quando há token
 * - Interceptor de resposta: em 401 tenta refresh token e repete a requisição
 * - Tokens lidos do AuthContext (getToken/getRefreshToken) para evitar import circular
 */

import axios, { type InternalAxiosRequestConfig } from 'axios'
import type { TokenResponse } from '@/types/api'

const baseURL = import.meta.env.VITE_API_URL ?? ''

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// Referências setadas pelo AuthContext após montar (evita circular dependency)
let getAccessToken: (() => string | null) | null = null
let getRefreshToken: (() => string | null) | null = null
let setTokens: ((access: string, refresh: string, expiresAt: string) => void) | null = null
let clearAuth: (() => void) | null = null

export function setAuthHelpers(helpers: {
  getAccessToken: () => string | null
  getRefreshToken: () => string | null
  setTokens: (access: string, refresh: string, expiresAt: string) => void
  clearAuth: () => void
}) {
  getAccessToken = helpers.getAccessToken
  getRefreshToken = helpers.getRefreshToken
  setTokens = helpers.setTokens
  clearAuth = helpers.clearAuth
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken?.()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshing = false
let queue: Array<{ resolve: (token: string | null) => void }> = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest._retry) {
      if (error.response?.status === 401) clearAuth?.()
      return Promise.reject(error)
    }

    const refresh = getRefreshToken?.()
    if (!refresh) {
      clearAuth?.()
      return Promise.reject(error)
    }

    if (refreshing) {
      return new Promise<unknown>((resolve) => {
        queue.push({
          resolve: (token: string | null) => {
            if (token) originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          },
        })
      })
    }

    originalRequest._retry = true
    refreshing = true

    try {
      const { data } = await axios.post<TokenResponse>(
        `${baseURL}/api/v1/auth/refresh`,
        { refreshToken: refresh },
        { headers: { 'Content-Type': 'application/json' } }
      )
      setTokens?.(data.accessToken, data.refreshToken, data.expiresAt)
      queue.forEach((q) => q.resolve(data.accessToken))
      queue = []
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
      return api(originalRequest)
    } catch {
      clearAuth?.()
      queue.forEach((q) => q.resolve(null))
      queue = []
      return Promise.reject(error)
    } finally {
      refreshing = false
    }
  }
)
