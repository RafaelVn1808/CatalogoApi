import { api } from './client'
import type { ImportacaoCsvResultDto } from '@/types/api'

export const importacaoApi = {
  importarEstoque: (
    file: File,
    options?: { somenteEstoque?: boolean; criarNovos?: boolean; apenasCodigoCategoria?: boolean }
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    if (options?.somenteEstoque != null)
      formData.append('somenteEstoque', String(options.somenteEstoque))
    if (options?.criarNovos != null)
      formData.append('criarNovos', String(options.criarNovos))
    if (options?.apenasCodigoCategoria != null)
      formData.append('apenasCodigoCategoria', String(options.apenasCodigoCategoria))

    return api.post<ImportacaoCsvResultDto>('/api/v1/importacao', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300_000,
    })
  },
}
