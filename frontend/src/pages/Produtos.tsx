import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search,
  Filter,
  MessageCircle,
  Package,
  X,
} from 'lucide-react'
import { produtosApi } from '@/api/produtos'
import { categoriasApi } from '@/api/categorias'
import { vitrinessApi } from '@/api/vitrines'
import { useAuth } from '@/contexts/AuthContext'
import CarrosselVitrine from '@/components/CarrosselVitrine'
import type { ProdutoListDto, CategoriaDto, VitrineDto } from '@/types/api'

const TAMANHO_PAGINA = 12

type OrdenarOpcao = 'relevancia' | 'preco-asc' | 'preco-desc' | 'nome-asc' | 'nome-desc'

export default function Produtos() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  const busca = searchParams.get('busca') ?? ''
  const categoriaId = searchParams.get('categoriaId') ? Number(searchParams.get('categoriaId')) : ('' as number | '')
  const precoMin = searchParams.get('precoMin') ?? ''
  const precoMax = searchParams.get('precoMax') ?? ''
  const ordenar = (searchParams.get('ordenar') ?? 'relevancia') as OrdenarOpcao
  const pagina = Number(searchParams.get('pagina') ?? '1') || 1

  const filtrosAtivos = [
    busca && 'busca',
    categoriaId !== '' && 'categoria',
    precoMin && 'preçoMin',
    precoMax && 'preçoMax',
  ].filter(Boolean).length

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
  const [vitrine, setVitrine] = useState<VitrineDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const activeCategory = categoriaId === '' ? 'Todos' : categorias.find((c) => c.id === categoriaId)?.nome ?? 'Todos'
  const totalExibido = total

  useEffect(() => {
    categoriasApi
      .listar()
      .then((r) => setCategorias(r.data))
      .catch(() => setCategorias([]))
  }, [])

  useEffect(() => {
    vitrinessApi
      .obterAtiva()
      .then((r) => setVitrine(r.data))
      .catch(() => setVitrine(null))
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
      ordenar === 'relevancia'
        ? ['Relevancia', 'desc']
        : ordenar === 'preco-asc'
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

  function renderProductCard(produto: ProdutoListDto) {
    const temDisp = temEstoque(produto)
    const podeReservar = temDisp && temWhatsApp(produto)
    return (
      <div key={produto.id} className="produto-card">
        <Link to={`/produtos/${produto.id}`} className="produto-card-img-link">
          <div className="produto-card-img">
            {produto.imagemUrl ? (
              <img src={produto.imagemUrl} alt={produto.nome} loading="lazy" />
            ) : (
              <div className="produto-card-sem-img">
                <Package size={24} />
              </div>
            )}
            <span className={`produto-badge ${temDisp ? 'badge-disponivel' : 'badge-esgotado'}`}>
              {temDisp ? 'Disponível' : 'Esgotado'}
            </span>
          </div>
        </Link>
        <div className="produto-card-body">
          <span className="produto-card-categoria">{produto.categoriaNome}</span>
          <h3 className="produto-card-nome">
            <Link to={`/produtos/${produto.id}`}>{produto.nome}</Link>
          </h3>
          <div className="produto-card-footer">
            <div className="produto-card-preco">
              {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <button
              type="button"
              onClick={() => handleReservar(produto)}
              disabled={!podeReservar}
              className={`produto-card-reservar ${podeReservar ? 'ativo' : ''}`}
            >
              <MessageCircle size={16} />
              <span className="reservar-text">Reservar</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  const filtrosContent = (
    <>
      <div className="filtro-campo">
        <label className="filtro-label">Buscar</label>
        <div style={{ position: 'relative' }}>
          <Search size={16} className="filtro-search-icon" />
          <input
            type="text"
            placeholder="O que você procura?"
            value={busca}
            onChange={(e) => setFilter('busca', e.target.value)}
            className="filtro-input filtro-input-search"
          />
        </div>
      </div>

      <div className="filtro-campo">
        <label className="filtro-label">Categorias</label>
        <select
          value={categoriaId === '' ? '' : categoriaId}
          onChange={(e) => setFilter('categoriaId', e.target.value)}
          className="filtro-select"
        >
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      <div className="filtro-campo">
        <label className="filtro-label">Preço (R$)</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Mín"
            value={precoMin}
            onChange={(e) => setFilter('precoMin', e.target.value)}
            className="filtro-input"
            style={{ flex: 1 }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>–</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Máx"
            value={precoMax}
            onChange={(e) => setFilter('precoMax', e.target.value)}
            className="filtro-input"
            style={{ flex: 1 }}
          />
        </div>
      </div>

      {precoMedio != null && (
        <div className="filtro-media">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Média de preço</span>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
            {precoMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      )}

      <div className="filtro-campo">
        <label className="filtro-label">Ordenar</label>
        <select
          value={ordenar}
          onChange={(e) => setFilter('ordenar', e.target.value)}
          className="filtro-select"
        >
          <option value="relevancia">Mais relevantes</option>
          <option value="preco-asc">Menor preço</option>
          <option value="preco-desc">Maior preço</option>
          <option value="nome-asc">Nome (A–Z)</option>
          <option value="nome-desc">Nome (Z–A)</option>
        </select>
      </div>

    </>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {vitrine && vitrine.itens.some((i) => i.ativo) && (
        <CarrosselVitrine vitrine={vitrine} />
      )}
      <main className="produtos-page">
        <div className="produtos-layout">
          {/* Desktop sidebar */}
          <aside className="sidebar-filtros sidebar-desktop">
            <div className="sidebar-filtros-inner">
              <div className="filtro-header">
                <Filter size={18} />
                Filtros
              </div>
              {filtrosContent}
            </div>
          </aside>

          <div className="produtos-area">
            {/* Mobile: apenas botão de filtros (busca fica no header) */}
            <div className="mobile-filtro-row">
              <button
                type="button"
                className="mobile-filtro-btn"
                onClick={() => setFiltrosAbertos(true)}
              >
                <Filter size={18} />
                Filtros
                {filtrosAtivos > 0 && <span className="filtro-badge">{filtrosAtivos}</span>}
              </button>
            </div>

            {/* Mobile: drawer de filtros */}
            {filtrosAbertos && (
              <div className="filtro-overlay" onClick={() => setFiltrosAbertos(false)}>
                <div className="filtro-drawer" onClick={(e) => e.stopPropagation()}>
                  <div className="filtro-drawer-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                      <Filter size={18} />
                      Filtros
                    </div>
                    <button type="button" onClick={() => setFiltrosAbertos(false)} className="filtro-drawer-close">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="filtro-drawer-body">
                    {filtrosContent}
                  </div>
                  <div className="filtro-drawer-footer">
                    <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => setFiltrosAbertos(false)}>
                      Ver {totalExibido} produtos
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="produtos-header">
              <div>
                <h1 className="produtos-area-titulo">Produtos</h1>
                <p className="produtos-area-subtitulo">
                  {activeCategory} <span className="produtos-area-count">({totalExibido} itens)</span>
                </p>
              </div>
              {user && (
                <Link to="/produtos/novo" className="btn btn-primary btn-sm-mobile">
                  Novo produto
                </Link>
              )}
            </div>

            {error && <p className="error-msg">{error}</p>}

            {/* Listagem paginada (Todos ou por categoria) */}
            <>
                {loading && <div className="loading">Carregando produtos...</div>}
                {!loading && !error && itens.length > 0 && (
                  <>
                    <div className="produtos-grid">
                      {itens.map((produto) => renderProductCard(produto))}
                    </div>
                    <div className="paginacao">
                      <button type="button" className="btn btn-ghost" disabled={pagina <= 1} onClick={() => setPagina(1)} aria-label="Primeira página">
                        Primeira
                      </button>
                      <button type="button" className="btn btn-ghost" disabled={pagina <= 1} onClick={() => setPagina((x) => x - 1)} aria-label="Página anterior">
                        Anterior
                      </button>
                      <span className="paginacao-info" aria-live="polite">
                        {pagina} / {totalPaginas || 1}
                      </span>
                      <button type="button" className="btn btn-ghost" disabled={pagina >= totalPaginas} onClick={() => setPagina((x) => x + 1)} aria-label="Próxima página">
                        Próxima
                      </button>
                      <button type="button" className="btn btn-ghost" disabled={pagina >= totalPaginas} onClick={() => setPagina(totalPaginas)} aria-label="Última página">
                        Última
                      </button>
                    </div>
                  </>
                )}
                {!loading && !error && itens.length === 0 && (
                  <div className="produtos-vazio">
                    <div className="produtos-vazio-icon">
                      <Search size={28} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                      Nenhum produto encontrado
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Tente ajustar sua busca ou categoria.</p>
                  </div>
                )}
              </>
          </div>
        </div>
      </main>

      <style>{`
        /* ===== Filtros compartilhados (menu limpo Kalunga) ===== */
        .filtro-header {
          display: flex; align-items: center; gap: 8px;
          font-weight: 700; color: #333; margin-bottom: 20px;
          font-size: 14px;
        }
        .filtro-campo { margin-bottom: 18px; }
        .filtro-label {
          display: block; font-size: 14px; font-weight: 700;
          color: #333; margin-bottom: 8px;
        }
        .filtro-input {
          width: 100%; padding: 10px 12px;
          border: 1px solid var(--border); border-radius: 6px;
          background: var(--surface); color: var(--text); font-size: 14px;
          outline: none;
        }
        .filtro-input:focus { border-color: var(--primary); }
        .filtro-input-search { padding-left: 34px; }
        .filtro-search-icon {
          position: absolute; left: 10px; top: 50%;
          transform: translateY(-50%); color: var(--text-muted); pointer-events: none;
        }
        .filtro-select {
          width: 100%; padding: 10px 12px;
          border: 1px solid var(--border); border-radius: 6px;
          background: var(--surface); color: var(--text); font-size: 14px;
        }
        .filtro-media {
          padding: 10px 12px; background: var(--border-light);
          border-radius: 6px; margin-bottom: 18px;
        }

        /* ===== Página ===== */
        .produtos-page { display: flex; flex-direction: column; min-height: calc(100vh - 80px); }
        .produtos-layout { display: flex; flex: 1; flex-direction: column; }

        /* ===== Desktop sidebar (menu limpo) ===== */
        .sidebar-desktop { display: none; }
        .sidebar-filtros-inner { padding: 24px 20px; font-size: 14px; }

        /* ===== Área de produtos ===== */
        .produtos-area { flex: 1; min-width: 0; padding: 0 16px 24px; }
        .produtos-area-titulo { font-size: 1.15rem; font-weight: 800; color: var(--text); margin: 0; }
        .produtos-area-subtitulo { font-size: 14px; font-weight: 600; color: var(--text); margin-top: 4px; }
        .produtos-area-count { color: var(--text-muted); font-weight: 400; font-size: 0.8rem; }
        .produtos-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 20px;
        }
        .btn-sm-mobile { font-size: 14px; padding: 8px 12px; }

        /* ===== Seções por categoria ===== */
        .produtos-secao {
          margin-bottom: 2.5rem;
        }
        .produtos-secao-titulo {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 1rem 0;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border);
        }

        /* ===== Mobile: linha do botão Filtros ===== */
        .mobile-filtro-row {
          display: flex; margin-bottom: 12px;
        }
        .mobile-filtro-btn {
          position: relative; display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 14px; height: 42px;
          border: 1px solid var(--border); border-radius: 6px;
          background: var(--surface); color: var(--text); font-weight: 500;
          cursor: pointer; font-size: 0.9rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .filtro-badge {
          position: absolute; top: -4px; right: -4px;
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--primary); color: white;
          font-size: 0.65rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }

        /* ===== Filtro drawer (mobile) ===== */
        .filtro-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.4);
          animation: fadeIn 0.2s ease;
        }
        .filtro-drawer {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: var(--surface); border-radius: 12px 12px 0 0;
          max-height: 85vh; display: flex; flex-direction: column;
          animation: slideUp 0.25s ease;
          box-shadow: 0 -1px 3px rgba(0,0,0,0.1);
        }
        .filtro-drawer-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px; border-bottom: 1px solid var(--border);
        }
        .filtro-drawer-close {
          background: none; border: none; color: var(--text-muted);
          padding: 4px; cursor: pointer;
        }
        .filtro-drawer-body { padding: 16px; overflow-y: auto; flex: 1; }
        .filtro-drawer-footer {
          padding: 12px 16px; border-top: 1px solid var(--border);
        }

        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }

        /* ===== Cards de produto (branco, sombra leve) ===== */
        .produtos-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
        }
        .produto-card {
          background: #FFFFFF; border-radius: 8px;
          border: 1px solid #eeeeee; overflow: hidden;
          display: flex; flex-direction: column;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: box-shadow 0.2s ease;
        }
        .produto-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        .produto-card-img-link { text-decoration: none; }
        .produto-card-img {
          position: relative; aspect-ratio: 1; overflow: hidden;
          background: var(--border-light);
        }
        .produto-card-img img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .produto-card-sem-img {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-muted);
        }
        .produto-badge {
          position: absolute; top: 6px; left: 6px;
          padding: 2px 8px; border-radius: 9999px;
          font-size: 0.6rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.03em;
        }
        .badge-disponivel { background: #dcfce7; color: #166534; }
        .badge-esgotado { background: #fee2e2; color: #b91c1c; }

        .produto-card-body { padding: 10px; flex: 1; display: flex; flex-direction: column; }
        .produto-card-categoria {
          font-size: 0.65rem; font-weight: 500; color: var(--primary);
          text-transform: uppercase; letter-spacing: 0.03em;
        }
        .produto-card-nome {
          font-size: 0.8rem; font-weight: 600; color: var(--text);
          line-height: 1.25; margin-top: 2px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .produto-card-nome a { color: inherit; text-decoration: none; }
        .produto-card-footer {
          margin-top: auto; padding-top: 8px;
          display: flex; align-items: center; justify-content: space-between; gap: 4px;
        }
        .produto-card-preco { font-size: 1rem; font-weight: 800; color: var(--text); }
        .produto-card-reservar {
          display: flex; align-items: center; gap: 4px;
          padding: 6px 8px; border-radius: 8px; font-weight: 600; font-size: 0.7rem;
          border: none; cursor: not-allowed;
          background: var(--border-light); color: var(--text-muted);
        }
        .produto-card-reservar.ativo {
          background: var(--primary); color: white; cursor: pointer;
        }
        .reservar-text { display: none; }

        /* ===== Paginação ===== */
        .paginacao {
          display: flex; gap: 8px; margin-top: 20px;
          justify-content: center; align-items: center;
          flex-wrap: wrap;
        }
        .paginacao-info {
          color: var(--text-muted);
          font-size: 0.875rem;
          min-width: 4ch;
          text-align: center;
        }

        /* ===== Vazio ===== */
        .produtos-vazio {
          text-align: center; padding: 48px 24px;
          background: #FFFFFF; border-radius: 6px;
          border: 1px solid var(--border);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .produtos-vazio-icon {
          display: inline-flex; padding: 12px;
          background: var(--border-light); border-radius: 50%; margin-bottom: 12px;
        }

        /* ===== Tablet (>=600px): 3 colunas ===== */
        @media (min-width: 600px) {
          .produtos-grid { grid-template-columns: repeat(3, 1fr); gap: 18px; }
          .produto-card-preco { font-size: 1.05rem; }
          .reservar-text { display: inline; }
          .produtos-area { padding: 0 20px 24px; }
        }

        /* ===== Desktop (>=768px) ===== */
        @media (min-width: 768px) {
          .produtos-layout { flex-direction: row; align-items: flex-start; }
          .sidebar-desktop {
            display: block; width: 250px; max-width: 250px; flex-shrink: 0;
            min-height: calc(100vh - 80px);
            border-right: 1px solid var(--border); background: #FFFFFF;
          }
          .sidebar-filtros-inner {
            position: sticky; top: 100px; padding: 24px 20px;
          }
          .mobile-filtro-row { display: none; }
          .produtos-area { flex: 1; padding: 28px 32px 32px; }
          .produtos-area-titulo { font-size: 1.4rem; }
          .produtos-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
          .produto-card-img { aspect-ratio: 4/3; }
          .produto-badge { top: 10px; left: 10px; padding: 3px 10px; font-size: 0.65rem; }
          .produto-card-body { padding: 14px; }
          .produto-card-categoria { font-size: 0.7rem; }
          .produto-card-nome { font-size: 0.95rem; }
          .produto-card-preco { font-size: 1.2rem; }
          .produto-card-reservar { padding: 8px 14px; font-size: 0.8rem; border-radius: 10px; }
          .reservar-text { display: inline; }
          .btn-sm-mobile { font-size: 0.875rem; padding: 10px 16px; }
        }

        /* ===== Widescreen (>=1280px) ===== */
        @media (min-width: 1280px) {
          .produtos-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
    </div>
  )
}
