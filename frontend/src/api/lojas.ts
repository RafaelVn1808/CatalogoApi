/**
 * Chamadas à API de lojas.
 */

import { api } from './client'
import type { LojaDto, LojaCreateDto, LojaUpdateDto } from '@/types/api'

export const lojasApi = {
  listar: () =>
    api.get<LojaDto[]>('/api/v1/lojas'),

  obter: (id: number) =>
    api.get<LojaDto>(`/api/v1/lojas/${id}`),

  criar: (body: LojaCreateDto) =>
    api.post<LojaDto>('/api/v1/lojas', body),

  atualizar: (id: number, body: LojaUpdateDto) =>
    api.put<LojaDto>(`/api/v1/lojas/${id}`, body),

  excluir: (id: number) =>
    api.delete(`/api/v1/lojas/${id}`),
}
