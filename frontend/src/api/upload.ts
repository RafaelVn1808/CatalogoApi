import { api } from './client'

export const uploadApi = {
  uploadImagemProduto: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ url: string }>('/api/v1/upload/produto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
