import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { produtosApi } from '@/api/produtos'
import { useAuth } from '@/contexts/AuthContext'
import type { ProdutoDetalheDto } from '@/types/api'

function getWhatsAppUrl(produto: ProdutoDetalheDto): string | null {
  const comEstoque = produto.lojasDisponiveis.filter((l) => l.disponivel)
  const lojaComWhatsApp = comEstoque.find((l) => l.lojaWhatsApp)
  const numero = lojaComWhatsApp?.lojaWhatsApp?.replace(/\D/g, '') ?? null
  if (!numero) return null
  const msg = encodeURIComponent(
    `Olá! Vi o produto "${produto.nome}" no catálogo e gostaria de saber mais informações sobre a disponibilidade.`
  )
  const whatsappNum = numero.startsWith('55') ? numero : `55${numero}`
  return `https://wa.me/${whatsappNum}?text=${msg}`
}

export default function ProdutoDetalhe() {
  const { user } = useAuth()
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

  const handleVoltar = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/produtos')
  }

  if (loading) return <div className="loading">Carregando...</div>
  if (error || !produto) return <div className="container"><p className="error-msg">{error || 'Produto não encontrado.'}</p><button type="button" className="btn btn-ghost" onClick={handleVoltar}>Voltar</button></div>

  return (
    <div className="container" style={{ padding: '0 12px' }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <button type="button" onClick={handleVoltar} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: '0.9rem' }}>← Produtos</button>
      </div>
      <div className="card detalhe-card">
        <div className="detalhe-grid">
          <div>
            {produto.imagemUrl ? (
              <img src={produto.imagemUrl} alt={produto.nome} style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border)' }} />
            ) : (
              <div style={{ aspectRatio: '1', background: 'var(--border-light)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Sem imagem
              </div>
            )}
          </div>
          <div>
            <h1 style={{ marginBottom: '0.25rem', fontSize: '1.15rem' }}>{produto.nome}</h1>
            {produto.codigo && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Código: {produto.codigo}</p>}
            <p style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 700, marginTop: '0.5rem' }}>
              R$ {produto.preco.toFixed(2).replace('.', ',')}
            </p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>{produto.categoria.nome}</p>
            {produto.descricao && <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{produto.descricao}</p>}
            {(() => {
              const url = getWhatsAppUrl(produto)
              const podeReservar = !!url
              return (
                <div style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => url && window.open(url, '_blank')}
                    disabled={!podeReservar}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      width: '100%',
                      justifyContent: 'center',
                      cursor: podeReservar ? 'pointer' : 'not-allowed',
                      background: podeReservar ? '#16a34a' : 'var(--border-light)',
                      color: podeReservar ? 'white' : 'var(--text-muted)',
                    }}
                  >
                    <MessageCircle size={18} />
                    Reservar via WhatsApp
                  </button>
                </div>
              )
            })()}
            {user && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link to={`/produtos/${id}/editar`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Editar</Link>
                <button type="button" className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={handleExcluir}>Excluir</button>
              </div>
            )}
          </div>
        </div>
        {produto.lojasDisponiveis.length > 0 && (
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600 }}>Disponibilidade por loja</h3>
            <ul style={{ listStyle: 'none' }}>
              {produto.lojasDisponiveis.map((l) => (
                <li key={l.lojaId} style={{ padding: '4px 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: l.disponivel ? '#16a34a' : '#dc2626',
                  }} />
                  {l.lojaNome}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <style>{`
        .detalhe-card { max-width: 600px; }
        .detalhe-grid { display: flex; flex-direction: column; gap: 1rem; }
        @media (min-width: 600px) {
          .detalhe-grid {
            display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: start;
          }
        }
      `}</style>
    </div>
  )
}
