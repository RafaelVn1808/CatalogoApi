import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { produtosApi } from '@/api/produtos'
import type { ProdutoDetalheDto } from '@/types/api'

export default function ProdutoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [produto, setProduto] = useState<ProdutoDetalheDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    produtosApi
      .obter(Number(id))
      .then((r) => setProduto(r.data))
      .catch((e) => setError(e.response?.status === 404 ? 'Produto não encontrado.' : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleExcluir() {
    if (!id || !window.confirm('Excluir este produto?')) return
    try {
      await produtosApi.excluir(Number(id))
      navigate('/produtos', { replace: true })
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao excluir.')
    }
  }

  if (loading) return <div className="loading">Carregando...</div>
  if (error || !produto) return <div className="container"><p className="error-msg">{error || 'Produto não encontrado.'}</p><Link to="/produtos">Voltar</Link></div>

  return (
    <div className="container">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/produtos">← Produtos</Link>
      </div>
      <div className="card" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div>
            {produto.imagemUrl ? (
              <img src={produto.imagemUrl} alt={produto.nome} style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border)' }} />
            ) : (
              <div style={{ aspectRatio: '1', background: 'var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Sem imagem
              </div>
            )}
          </div>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>{produto.nome}</h1>
            {produto.codigo && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Código: {produto.codigo}</p>}
            <p style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.5rem' }}>
              R$ {produto.preco.toFixed(2).replace('.', ',')}
            </p>
            <p style={{ marginTop: '0.75rem' }}>{produto.categoria.nome}</p>
            {produto.descricao && <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>{produto.descricao}</p>}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link to={`/produtos/${id}/editar`} className="btn btn-primary">Editar</Link>
              <button type="button" className="btn btn-danger" onClick={handleExcluir}>Excluir</button>
            </div>
          </div>
        </div>
        {produto.lojasDisponiveis.length > 0 && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Disponibilidade por loja</h3>
            <ul style={{ listStyle: 'none' }}>
              {produto.lojasDisponiveis.map((l) => (
                <li key={l.lojaId} style={{ padding: '0.25rem 0' }}>
                  {l.lojaNome}: {l.quantidade} un.
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
