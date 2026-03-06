/**
 * Chamadas à API de produtos.
 */

import { api } from './client'
import type {
  ProdutoListarResponse,
  ProdutoDetalheDto,
  ProdutoCreateDto,
  ProdutoUpdateDto,
  EstoqueLojaDto,
} from '@/types/api'

export const produtosApi = {
  listar: (params?: {
    busca?: string
    categoriaId?: number
    precoMin?: number
    precoMax?: number
    ativo?: boolean
    disponivel?: boolean
    incluirInativos?: boolean
    ordenarPor?: string
    ordenarDirecao?: string
    pagina?: number
    tamanho?: number
  }) =>
    api.get<ProdutoListarResponse>('/api/v1/produtos', { params }),

  obter: (id: number) =>
    api.get<ProdutoDetalheDto>(`/api/v1/produtos/${id}`),

  criar: (body: ProdutoCreateDto) =>
    api.post<ProdutoDetalheDto>('/api/v1/produtos', body),

  atualizar: (id: number, body: ProdutoUpdateDto) =>
    api.put<ProdutoDetalheDto>(`/api/v1/produtos/${id}`, body),

  atualizarAtivo: (id: number, ativo: boolean) =>
    api.put(`/api/v1/produtos/${id}/ativo`, { ativo }),

  excluir: (id: number) =>
    api.delete(`/api/v1/produtos/${id}`),

  atualizarEstoque: (id: number, estoques: EstoqueLojaDto[]) =>
    api.put(`/api/v1/produtos/${id}/estoque`, estoques),
}
