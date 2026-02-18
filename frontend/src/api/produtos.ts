/**
 * Chamadas à API de produtos.
 */

import { api } from './client'
import type {
  PaginacaoResponse,
  ProdutoListDto,
  ProdutoDetalheDto,
  ProdutoCreateDto,
  ProdutoUpdateDto,
  EstoqueLojaDto,
} from '@/types/api'

export const produtosApi = {
  listar: (params?: { busca?: string; categoriaId?: number; pagina?: number; tamanho?: number }) =>
    api.get<PaginacaoResponse<ProdutoListDto>>('/api/v1/produtos', { params }),

  obter: (id: number) =>
    api.get<ProdutoDetalheDto>(`/api/v1/produtos/${id}`),

  criar: (body: ProdutoCreateDto) =>
    api.post<ProdutoDetalheDto>('/api/v1/produtos', body),

  atualizar: (id: number, body: ProdutoUpdateDto) =>
    api.put<ProdutoDetalheDto>(`/api/v1/produtos/${id}`, body),

  excluir: (id: number) =>
    api.delete(`/api/v1/produtos/${id}`),

  atualizarEstoque: (id: number, estoques: EstoqueLojaDto[]) =>
    api.put(`/api/v1/produtos/${id}/estoque`, estoques),
}
