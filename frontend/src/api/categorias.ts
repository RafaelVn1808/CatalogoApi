/**
 * Chamadas à API de categorias.
 */

import { api } from './client'
import type { CategoriaDto, CategoriaCreateDto, CategoriaUpdateDto } from '@/types/api'

export const categoriasApi = {
  listar: () =>
    api.get<CategoriaDto[]>('/api/v1/categorias'),

  obter: (id: number) =>
    api.get<CategoriaDto>(`/api/v1/categorias/${id}`),

  criar: (body: CategoriaCreateDto) =>
    api.post<CategoriaDto>('/api/v1/categorias', body),

  atualizar: (id: number, body: CategoriaUpdateDto) =>
    api.put<CategoriaDto>(`/api/v1/categorias/${id}`, body),

  excluir: (id: number) =>
    api.delete(`/api/v1/categorias/${id}`),
}
