import { useState, useEffect } from 'react'
import { estoqueApi } from '@/api/estoque'
import { lojasApi } from '@/api/lojas'
import type { EstoqueItemDto } from '@/types/api'
import type { LojaDto } from '@/types/api'

export default function Estoque() {
  const [itens, setItens] = useState<EstoqueItemDto[]>([])
  const [lojas, setLojas] = useState<LojaDto[]>([])
  const [lojaId, setLojaId] = useState<number | ''>('')
  const [apenasComEstoque, setApenasComEstoque] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    lojasApi.listar().then((r) => setLojas(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    const params = {
      lojaId: lojaId === '' ? undefined : lojaId,
      apenasComEstoque,
    }
    const promise = lojaId === ''
      ? estoqueApi.listar(params)
      : estoqueApi.porLoja(lojaId, { apenasComEstoque })
    promise
      .then((r) => setItens(r.data))
      .catch(() => setError('Erro ao carregar estoque.'))
      .finally(() => setLoading(false))
  }, [lojaId, apenasComEstoque])

  return (
    <div className="container">
      <h1 style={{ marginBottom: '1.5rem' }}>Estoque</h1>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={lojaId === '' ? '' : lojaId}
          onChange={(e) => setLojaId(e.target.value === '' ? '' : Number(e.target.value))}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', color: 'var(--text)', minWidth: '200px' }}
        >
          <option value="">Todas as lojas</option>
          {lojas.map((l) => (
            <option key={l.id} value={l.id}>{l.nome}</option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={apenasComEstoque} onChange={(e) => setApenasComEstoque(e.target.checked)} />
          Apenas com estoque
        </label>
      </div>
      {error && <p className="error-msg">{error}</p>}
      {loading && <div className="loading">Carregando...</div>}
      {!loading && !error && (
        <div className="card">
          {itens.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Nenhum item de estoque encontrado.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem' }}>Produto</th>
                  <th style={{ padding: '0.75rem' }}>Código</th>
                  <th style={{ padding: '0.75rem' }}>Loja</th>
                  <th style={{ padding: '0.75rem' }}>Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, i) => (
                  <tr key={`${item.produtoId}-${item.lojaId}-${i}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem' }}>{item.produtoNome}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{item.produtoCodigo ?? '—'}</td>
                    <td style={{ padding: '0.75rem' }}>{item.lojaNome}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{item.quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
