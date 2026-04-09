import { api } from './client'
import type {
  VitrineDto,
  VitrineCreateDto,
  VitrineUpdateDto,
  VitrineItemDto,
  VitrineItemCreateDto,
  VitrineItemUpdateDto,
} from '@/types/api'

export const vitrinessApi = {
  obterAtiva: () =>
    api.get<VitrineDto>('/api/v1/vitrines/ativa'),

  listar: () =>
    api.get<VitrineDto[]>('/api/v1/vitrines'),

  criar: (body: VitrineCreateDto) =>
    api.post<VitrineDto>('/api/v1/vitrines', body),

  atualizar: (id: number, body: VitrineUpdateDto) =>
    api.put<VitrineDto>(`/api/v1/vitrines/${id}`, body),

  excluir: (id: number) =>
    api.delete(`/api/v1/vitrines/${id}`),

  adicionarItem: (vitrineId: number, body: VitrineItemCreateDto) =>
    api.post<VitrineItemDto>(`/api/v1/vitrines/${vitrineId}/itens`, body),

  atualizarItem: (itemId: number, body: VitrineItemUpdateDto) =>
    api.put<VitrineItemDto>(`/api/v1/vitrines/itens/${itemId}`, body),

  removerItem: (itemId: number) =>
    api.delete(`/api/v1/vitrines/itens/${itemId}`),

  uploadImagem: async (file: File): Promise<string> => {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post<{ url: string }>('/api/v1/upload/promo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.url
  },
}
