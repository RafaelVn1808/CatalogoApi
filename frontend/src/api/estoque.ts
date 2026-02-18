/**
 * Chamadas à API de estoque (requer autenticação).
 */

import { api } from './client'
import type { EstoqueItemDto } from '@/types/api'

export const estoqueApi = {
  listar: (params?: { lojaId?: number; apenasComEstoque?: boolean }) =>
    api.get<EstoqueItemDto[]>('/api/v1/estoque', { params }),

  porLoja: (lojaId: number, params?: { apenasComEstoque?: boolean }) =>
    api.get<EstoqueItemDto[]>(`/api/v1/estoque/loja/${lojaId}`, { params }),
}
