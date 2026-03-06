import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search,
  Filter,
  MessageCircle,
  Package,
} from 'lucide-react'
import { produtosApi } from '@/api/produtos'
import { categoriasApi } from '@/api/categorias'
import { useAuth } from '@/contexts/AuthContext'
import type { ProdutoListDto } from '@/types/api'
import type { CategoriaDto } from '@/types/api'

const TAMANHO_PAGINA = 12

type OrdenarOpcao = 'preco-asc' | 'preco-desc' | 'nome-asc' | 'nome-desc'

export default function Produtos() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const busca = searchParams.get('busca') ?? ''
  const categoriaId = searchParams.get('categoriaId') ? Number(searchParams.get('categoriaId')) : ('' as number | '')
  const precoMin = searchParams.get('precoMin') ?? ''
  const precoMax = searchParams.get('precoMax') ?? ''
  const ordenar = (searchParams.get('ordenar') ?? 'nome-asc') as OrdenarOpcao
  const pagina = Number(searchParams.get('pagina') ?? '1') || 1

  const setFilter = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'pagina') next.delete('pagina')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setPagina = useCallback((v: number | ((p: number) => number)) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      const cur = Number(prev.get('pagina') ?? '1') || 1
      const nova = typeof v === 'function' ? v(cur) : v
      if (nova > 1) next.set('pagina', String(nova))
      else next.delete('pagina')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const [itens, setItens] = useState<ProdutoListDto[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [precoMedio, setPrecoMedio] = useState<number | null>(null)
  const [categorias, setCategorias] = useState<CategoriaDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const activeCategory = categoriaId === '' ? 'Todos' : categorias.find((c) => c.id === categoriaId)?.nome ?? 'Todos'

  useEffect(() => {
    categoriasApi
      .listar()
      .then((r) => setCategorias(r.data))
      .catch(() => setCategorias([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    const parsePreco = (s: string): number | undefined => {
      if (s.trim() === '') return undefined
      const n = Number(s.replace(',', '.'))
      return Number.isFinite(n) ? n : undefined
    }
    const precoMinNum = parsePreco(precoMin)
    const precoMaxNum = parsePreco(precoMax)
    const [ordenarPor, ordenarDirecao] =
      ordenar === 'preco-asc'
        ? ['Preco', 'asc']
        : ordenar === 'preco-desc'
          ? ['Preco', 'desc']
          : ordenar === 'nome-desc'
            ? ['Nome', 'desc']
            : ['Nome', 'asc']

    produtosApi
      .listar({
        pagina,
        tamanho: TAMANHO_PAGINA,
        busca: busca || undefined,
        categoriaId: categoriaId === '' ? undefined : categoriaId,
        precoMin: precoMinNum,
        precoMax: precoMaxNum,
        ordenarPor,
        ordenarDirecao,
      })
      .then((r) => {
        setItens(r.data.itens)
        setTotal(r.data.total)
        setTotalPaginas(r.data.totalPaginas)
        setPrecoMedio(r.data.precoMedio ?? null)
      })
      .catch((e) => setError(e.response?.data?.message ?? 'Erro ao carregar produtos.'))
      .finally(() => setLoading(false))
  }, [pagina, busca, categoriaId, precoMin, precoMax, ordenar])

  function getWhatsAppUrl(produto: ProdutoListDto): string | null {
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

  function handleReservar(produto: ProdutoListDto) {
    const url = getWhatsAppUrl(produto)
    if (url) window.open(url, '_blank')
  }

  const temEstoque = (p: ProdutoListDto) => p.lojasDisponiveis.some((l) => l.disponivel)
  const temWhatsApp = (p: ProdutoListDto) => !!getWhatsAppUrl(p)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Layout no modelo: [ Filtros | Produtos ] */}
      <main className="produtos-page">
        <div className="produtos-layout">
          {/* Coluna esquerda: Filtros (faixa estreita, altura total) */}
          <aside className="sidebar-filtros">
            <div className="sidebar-filtros-inner">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 20,
                  fontWeight: 700,
                  color: 'var(--text)',
                }}
              >
                <Filter size={20} />
                Filtros
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Buscar</label>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={18}
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="O que você procura?"
                    value={busca}
                    onChange={(e) => setFilter('busca', e.target.value)}
                    style={{
                      width: '100%',
                      paddingLeft: 36,
                      paddingRight: 12,
                      paddingTop: 10,
                      paddingBottom: 10,
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      background: 'var(--surface)',
                      fontSize: '0.9rem',
                      color: 'var(--text)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Categorias</label>
                <select
                  value={categoriaId === '' ? '' : categoriaId}
                  onChange={(e) => setFilter('categoriaId', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="">Todas as categorias</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Preço (R$)</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Mín"
                    value={precoMin}
                    onChange={(e) => setFilter('precoMin', e.target.value)}
                    style={{
                      width: 80,
                      padding: '8px 10px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '0.9rem',
                    }}
                  />
                  <span style={{ color: 'var(--text-muted)' }}>–</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Máx"
                    value={precoMax}
                    onChange={(e) => setFilter('precoMax', e.target.value)}
                    style={{
                      width: 80,
                      padding: '8px 10px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
              </div>

              {precoMedio != null && (
                <div style={{ marginBottom: 20, padding: '10px 12px', background: 'var(--border-light)', borderRadius: 10 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Média de preço (resultado)</span>
                  <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
                    {precoMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Ordenar</label>
                <select
                  value={ordenar}
                    onChange={(e) => setFilter('ordenar', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="preco-asc">Menor preço</option>
                  <option value="preco-desc">Maior preço</option>
                  <option value="nome-asc">Nome (A–Z)</option>
                  <option value="nome-desc">Nome (Z–A)</option>
                </select>
              </div>

              <div
                style={{
                  marginTop: 24,
                  paddingTop: 24,
                  borderTop: '1px solid var(--border-light)',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <Package size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text)' }}>Gestão Local</p>
                    <p>Preços e estoque atualizados diariamente. Produtos marcados como indisponíveis nas lojas aparecem como &quot;Esgotado&quot;.</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Coluna direita: Produtos (área principal) */}
          <div className="produtos-area">
            <h1 className="produtos-area-titulo">Produtos</h1>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
                {activeCategory}{' '}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.875rem', marginLeft: 8 }}>
                  ({total} itens)
                </span>
              </h2>
              {user ? (
                <Link to="/produtos/novo" className="btn btn-primary">
                  Novo produto
                </Link>
              ) : (
                <Link to="/login" className="btn btn-primary">
                  Admin
                </Link>
              )}
            </div>

            {error && <p className="error-msg">{error}</p>}
            {loading && <div className="loading">Carregando produtos...</div>}

            {!loading && !error && itens.length > 0 && (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(1, 1fr)',
                    gap: 24,
                  }}
                  className="produtos-grid"
                >
                  {itens.map((produto) => {
                    const temDisp = temEstoque(produto)
                    const podeReservar = temDisp && temWhatsApp(produto)
                    return (
                      <div
                        key={produto.id}
                        style={{
                          background: 'var(--surface)',
                          borderRadius: 16,
                          border: '1px solid var(--border)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        }}
                      >
                        <div style={{ position: 'relative', height: 224, overflow: 'hidden' }}>
                          {produto.imagemUrl ? (
                            <img
                              src={produto.imagemUrl}
                              alt={produto.nome}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                background: 'var(--border-light)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-muted)',
                              }}
                            >
                              Sem imagem
                            </div>
                          )}
                          <span
                            style={{
                              position: 'absolute',
                              top: 16,
                              left: 16,
                              padding: '4px 12px',
                              borderRadius: 9999,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              background: temDisp ? '#dcfce7' : '#fee2e2',
                              color: temDisp ? '#166534' : '#b91c1c',
                            }}
                          >
                            {temDisp ? 'Disponível' : 'Esgotado'}
                          </span>
                        </div>
                        <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ marginBottom: 8 }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: 'var(--primary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                              }}
                            >
                              {produto.categoriaNome}
                            </span>
                            <h3
                              style={{
                                fontWeight: 700,
                                color: 'var(--text)',
                                fontSize: '1.125rem',
                                lineHeight: 1.3,
                                marginTop: 4,
                              }}
                            >
                              <Link to={`/produtos/${produto.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                {produto.nome}
                              </Link>
                            </h3>
                          </div>
                          <div
                            style={{
                              marginTop: 'auto',
                              paddingTop: 16,
                              borderTop: '1px solid var(--border-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                            }}
                          >
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
                              {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleReservar(produto)}
                              disabled={!podeReservar}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 16px',
                                borderRadius: 12,
                                fontWeight: 600,
                                border: 'none',
                                cursor: podeReservar ? 'pointer' : 'not-allowed',
                                background: podeReservar ? '#16a34a' : 'var(--border-light)',
                                color: podeReservar ? 'white' : 'var(--text-muted)',
                              }}
                            >
                              <MessageCircle size={18} />
                              Reservar
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {totalPaginas > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginTop: 24,
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={pagina <= 1}
                      onClick={() => setPagina((x) => x - 1)}
                    >
                      Anterior
                    </button>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Página {pagina} de {totalPaginas}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={pagina >= totalPaginas}
                      onClick={() => setPagina((x) => x + 1)}
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </>
            )}

            {!loading && !error && itens.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: 80,
                  background: 'var(--surface)',
                  borderRadius: 24,
                  border: '1px dashed var(--border)',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    padding: 16,
                    background: 'var(--border-light)',
                    borderRadius: 9999,
                    marginBottom: 16,
                  }}
                >
                  <Search size={32} style={{ color: 'var(--text-muted)' }} />
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  Nenhum produto encontrado
                </h3>
                <p style={{ color: 'var(--text-muted)' }}>Tente ajustar sua busca ou categoria.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .produtos-page {
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 80px);
        }
        .produtos-layout {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 24px;
          align-items: stretch;
        }
        .sidebar-filtros {
          flex-shrink: 0;
          width: 100%;
          border-bottom: 1px solid var(--border);
        }
        .sidebar-filtros-inner {
          background: var(--surface);
          padding: 24px;
          border-radius: 0;
          border: none;
          box-shadow: none;
        }
        .produtos-area {
          flex: 1;
          min-width: 0;
          padding: 0 1.5rem 1.5rem;
        }
        .produtos-area-titulo {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 1.5rem;
        }
        @media (min-width: 768px) {
          .produtos-layout {
            flex-direction: row;
            align-items: flex-start;
            gap: 0;
          }
          .sidebar-filtros {
            width: 260px;
            max-width: 260px;
            min-height: calc(100vh - 80px);
            border-bottom: none;
            border-right: 1px solid var(--border);
            background: var(--surface);
          }
          .sidebar-filtros-inner {
            position: sticky;
            top: 104px;
            padding: 24px 20px;
            border-radius: 0;
          }
          .produtos-area {
            flex: 1;
            padding: 24px 32px 32px;
          }
          .produtos-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 1280px) {
          .produtos-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
