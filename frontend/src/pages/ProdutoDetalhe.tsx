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
    <div className="container">
      <div style={{ marginBottom: '1rem' }}>
        <button type="button" onClick={handleVoltar} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>← Produtos</button>
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
            {(() => {
              const url = getWhatsAppUrl(produto)
              const podeReservar = !!url
              return (
                <div style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => url && window.open(url, '_blank')}
                    disabled={!podeReservar}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '0.625rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: podeReservar ? 'pointer' : 'not-allowed',
                      background: podeReservar ? '#16a34a' : 'var(--border-light)',
                      color: podeReservar ? 'white' : 'var(--text-muted)',
                    }}
                  >
                    <MessageCircle size={20} />
                    Reservar / Pedir via WhatsApp
                  </button>
                </div>
              )
            })()}
            {user && (
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link to={`/produtos/${id}/editar`} className="btn btn-primary">Editar</Link>
                <button type="button" className="btn btn-danger" onClick={handleExcluir}>Excluir</button>
              </div>
            )}
          </div>
        </div>
        {produto.lojasDisponiveis.length > 0 && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Disponibilidade por loja</h3>
            <ul style={{ listStyle: 'none' }}>
              {produto.lojasDisponiveis.map((l) => (
                <li key={l.lojaId} style={{ padding: '0.25rem 0' }}>
                  {l.lojaNome}: {l.disponivel ? 'Disponível' : 'Indisponível'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
