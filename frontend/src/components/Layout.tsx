import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { categoriasApi } from '@/api/categorias'
import type { CategoriaDto } from '@/types/api'
import {
  Menu,
  X,
  MapPin,
  Clock,
  Phone,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)
  const categoriasListRef = useRef<HTMLElement>(null)
  const [scrollState, setScrollState] = useState({ canLeft: false, canRight: true })
  const [categorias, setCategorias] = useState<CategoriaDto[]>([])
  const navigate = useNavigate()
  const location = useLocation()
  const buscaFromUrl = new URLSearchParams(location.search).get('busca') ?? ''
  const [buscaInput, setBuscaInput] = useState(buscaFromUrl)
  const searchParams = new URLSearchParams(location.search)
  const categoriaIdFromUrl = location.pathname === '/produtos' ? searchParams.get('categoriaId') : null

  useEffect(() => {
    setBuscaInput(buscaFromUrl)
  }, [buscaFromUrl])

  useEffect(() => {
    categoriasApi
      .listar()
      .then((r) => setCategorias(r.data ?? []))
      .catch(() => setCategorias([]))
  }, [])

  const updateScrollState = useCallback(() => {
    const el = categoriasListRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const tol = 2
    setScrollState({
      canLeft: scrollLeft > tol,
      canRight: scrollLeft < scrollWidth - clientWidth - tol,
    })
  }, [])

  useEffect(() => {
    updateScrollState()
    const el = categoriasListRef.current
    if (!el) return
    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)
    return () => ro.disconnect()
  }, [categorias, updateScrollState])

  function scrollCategorias(dir: 'left' | 'right') {
    const el = categoriasListRef.current
    if (!el) return
    if (dir === 'left') el.scrollTo({ left: 0, behavior: 'smooth' })
    else el.scrollTo({ left: el.scrollWidth - el.clientWidth, behavior: 'smooth' })
  }

  const fecharMenu = () => setMenuAberto(false)

  function handleBuscaSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valor = (e.currentTarget.querySelector('input')?.value ?? '').trim()
    const params = new URLSearchParams(location.search)
    if (valor) params.set('busca', valor)
    else params.delete('busca')
    params.delete('pagina')
    navigate(`/produtos?${params.toString()}`, { replace: true })
  }

  const pathname = location.pathname
  const isProdutosActive = pathname === '/produtos' && !new URLSearchParams(location.search).get('categoriaId')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Barra utility (admin) */}
      <div className="layout-utility">
        <div className="container layout-utility-inner">
          <div className="layout-utility-left">
            <Link to="/nossa-loja" className="layout-utility-link">Nossas Lojas</Link>
            <span className="layout-utility-sep">|</span>
            <span className="layout-utility-text">Atendimento</span>
          </div>
          <div className="layout-utility-right">
            {user ? (
              <>
                <NavLink to="/categorias" className={({ isActive }) => `layout-utility-link ${isActive ? 'active' : ''}`}>Categorias</NavLink>
                <NavLink to="/lojas" className={({ isActive }) => `layout-utility-link ${isActive ? 'active' : ''}`}>Lojas</NavLink>
                <NavLink to="/estoque" className={({ isActive }) => `layout-utility-link ${isActive ? 'active' : ''}`}>Estoque</NavLink>
                <NavLink to="/vitrines" className={({ isActive }) => `layout-utility-link ${isActive ? 'active' : ''}`}>Vitrines</NavLink>
                <span className="layout-utility-sep">|</span>
                <span className="layout-utility-user">{user.nome}</span>
                <button type="button" className="layout-utility-btn" onClick={logout}>Sair</button>
              </>
            ) : (
              <Link to="/login" className="layout-utility-link">Admin</Link>
            )}
          </div>
        </div>
      </div>

      <header className="layout-header">
        <div className="container" style={{ maxWidth: 1280, padding: '0 12px' }}>
          <div className="layout-header-inner">
            <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <img src="/logo.png" alt="Grupo Bompreço" className="layout-logo" />
            </Link>

            <nav className="layout-header-nav" aria-label="Navegação principal">
              <Link
                to="/produtos"
                className={`layout-header-link ${isProdutosActive ? 'active' : ''}`}
              >
                Produtos
              </Link>
              <NavLink to="/nossa-loja" className={({ isActive }) => `layout-header-link ${isActive ? 'active' : ''}`}>
                Nossa loja
              </NavLink>
            </nav>

            <form className="layout-search-form" onSubmit={handleBuscaSubmit} role="search">
              <input
                type="search"
                name="q"
                className="layout-search-input"
                placeholder="O que você está procurando?"
                value={buscaInput}
                onChange={(e) => setBuscaInput(e.target.value)}
                aria-label="Buscar produtos"
              />
              <button type="submit" className="layout-search-btn" aria-label="Buscar">
                <Search size={18} />
              </button>
            </form>

            <button type="button" className="nav-mobile-toggle" aria-label="Menu" onClick={() => setMenuAberto(!menuAberto)}>
              {menuAberto ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Barra de categorias: label integrado à barra + setas + lista horizontal rolável */}
        <div className="layout-nav-bar">
          <div className="container layout-nav-bar-inner">
            <span className="layout-nav-categorias-label" aria-hidden>
              <Menu size={16} className="layout-nav-categorias-icon" />
              <span className="layout-nav-categorias-text">Categorias</span>
            </span>
            <div className="layout-nav-categorias-scroll-wrapper">
              <button
                type="button"
                className="layout-nav-cat-arrow"
                aria-label="Categorias anteriores"
                disabled={!scrollState.canLeft}
                onClick={() => scrollCategorias('left')}
              >
                <ChevronLeft size={18} />
              </button>
              <nav
                ref={categoriasListRef}
                className="layout-nav-categorias-list"
                aria-label="Categorias de produtos"
                onScroll={updateScrollState}
              >
                <Link
                  to="/produtos"
                  className={`layout-nav-cat-link ${location.pathname === '/produtos' && !categoriaIdFromUrl ? 'active' : ''}`}
                >
                  Todas
                </Link>
                {categorias.map((c) => (
                  <Link
                    key={c.id}
                    to={`/produtos?categoriaId=${c.id}`}
                    className={`layout-nav-cat-link ${location.pathname === '/produtos' && categoriaIdFromUrl === String(c.id) ? 'active' : ''}`}
                  >
                    {c.nome}
                  </Link>
                ))}
              </nav>
              <button
                type="button"
                className="layout-nav-cat-arrow"
                aria-label="Próximas categorias"
                disabled={!scrollState.canRight}
                onClick={() => scrollCategorias('right')}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Menu mobile */}
        {menuAberto && (
          <div className="mobile-menu-overlay" onClick={fecharMenu}>
            <nav className="mobile-menu" onClick={(e) => e.stopPropagation()}>
              <Link to="/produtos" className={`layout-nav-link ${isProdutosActive ? 'active' : ''}`} onClick={fecharMenu}>
                Produtos
              </Link>
              <NavLink to="/nossa-loja" className={({ isActive }) => `layout-nav-link ${isActive ? 'active' : ''}`} onClick={fecharMenu}>
                Nossa loja
              </NavLink>
              <div className="mobile-menu-categorias">
                <span className="mobile-menu-categorias-title">Categorias</span>
                <Link to="/produtos" className="mobile-menu-cat-link" onClick={fecharMenu}>Todas</Link>
                {categorias.map((c) => (
                  <Link
                    key={c.id}
                    to={`/produtos?categoriaId=${c.id}`}
                    className="mobile-menu-cat-link"
                    onClick={fecharMenu}
                  >
                    {c.nome}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main style={{ flex: 1, padding: '1rem 0' }}>
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="layout-footer">
        <div className="container footer-grid">
          <div>
            <img src="/logo.png" alt="Grupo Bom Preço" className="layout-footer-logo" />
            <p className="footer-desc">
              O Grupo Bom Preço oferece a melhor variedade em produtos com qualidade e preços justos.
            </p>
          </div>
          <div>
            <h4 className="footer-title">Atendimento</h4>
            <div className="footer-info-row">
              <MapPin size={16} className="footer-icon" />
              <span>Rua Silas Pinheiro, 18 - Centro - Anajás - PA</span>
            </div>
            <div className="footer-info-row">
              <Phone size={16} className="footer-icon" />
              <span>(91) 98403-2611</span>
            </div>
            <div className="footer-info-row">
              <Clock size={16} className="footer-icon" />
              <span>Seg-Sáb: 08:00 às 18:30</span>
            </div>
          </div>
          <div>
            <h4 className="footer-title">Links</h4>
            <ul className="footer-links">
              <li><Link to="/produtos">Produtos</Link></li>
              <li><Link to="/nossa-loja">Nossa loja</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-copy">
          © {new Date().getFullYear()} Grupo Bom Preço. Todos os direitos reservados.
        </div>
      </footer>

      <style>{`
        .layout-utility {
          background: var(--header-utility-bg);
          color: #e5e7eb;
          font-size: 0.8rem;
        }
        .layout-utility-inner {
          max-width: 1280px; margin: 0 auto; padding: 0 12px;
          display: flex; justify-content: space-between; align-items: center;
          height: 36px;
        }
        .layout-utility-left { display: flex; align-items: center; gap: 10px; }
        .layout-utility-link { color: #e5e7eb; text-decoration: none; }
        .layout-utility-link:hover { color: white; text-decoration: underline; }
        .layout-utility-link.active { color: white; font-weight: 600; }
        .layout-utility-sep { color: #9ca3af; }
        .layout-utility-text { color: #d1d5db; }
        .layout-utility-right { display: flex; align-items: center; gap: 12px; }
        .layout-utility-user { color: #d1d5db; }
        .layout-utility-btn {
          background: transparent; border: none; color: #e5e7eb;
          cursor: pointer; font-size: inherit; padding: 0;
        }
        .layout-utility-btn:hover { color: white; text-decoration: underline; }

        .layout-header {
          position: sticky; top: 0; z-index: 50;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
        }
        .layout-header-inner {
          display: flex; align-items: center; gap: 16px;
          height: 56px;
        }
        .layout-logo { height: 40px; width: auto; object-fit: contain; display: block; flex-shrink: 0; }
        .layout-search-form {
          flex: 1; min-width: 0; max-width: 420px; margin: 0 8px;
          position: relative;
        }
        .layout-search-input {
          width: 100%; padding: 10px 44px 10px 14px;
          border: 1px solid var(--border); border-radius: 6px;
          background: var(--border-light); color: var(--text);
          font-size: 14px; outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .layout-search-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.15);
        }
        .layout-search-btn {
          position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
          width: 36px; height: 36px; border: none; border-radius: 6px;
          background: var(--primary); color: white;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
        }
        .layout-search-btn:hover { background: var(--primary-hover); }
        .layout-header-nav {
          display: none;
          align-items: center; gap: 12px;
        }
        .layout-header-link {
          color: var(--text-muted); text-decoration: none;
          font-size: 0.875rem; font-weight: 500;
          padding: 6px 0; transition: color 0.15s;
        }
        .layout-header-link:hover { color: var(--primary); }
        .layout-header-link.active { color: var(--primary); font-weight: 600; }

        .layout-nav-bar {
          display: none;
          background: var(--nav-bar-bg);
        }
        .layout-nav-bar-inner {
          max-width: 1280px; margin: 0 auto; padding: 0 12px;
          display: flex; align-items: center; flex-wrap: nowrap; gap: 0;
          min-height: 48px;
        }
        .layout-nav-categorias-label {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 10px 14px; flex-shrink: 0;
          background: transparent; color: #FFFFFF;
          border-radius: 9999px; border: none;
          font-size: 13px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.02em;
          margin-right: 8px;
          transition: background 0.2s ease;
        }
        .layout-nav-categorias-label:hover {
          background: rgba(255,255,255,0.1);
        }
        .layout-nav-categorias-icon { color: #D32F2F; flex-shrink: 0; }
        .layout-nav-categorias-text { color: inherit; }
        .layout-nav-categorias-scroll-wrapper {
          display: flex; align-items: center; gap: 4px;
          min-width: 0; flex: 1;
        }
        .layout-nav-cat-arrow {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; flex-shrink: 0;
          background: rgba(255,255,255,0.1); color: #FFFFFF;
          border: none; border-radius: 4px; cursor: pointer;
          transition: background 0.2s, opacity 0.2s;
        }
        .layout-nav-cat-arrow:hover:not(:disabled) {
          background: rgba(255,255,255,0.2);
        }
        .layout-nav-cat-arrow:disabled {
          opacity: 0.4; cursor: not-allowed;
        }
        .layout-nav-categorias-list {
          display: flex; align-items: center; flex-wrap: nowrap; gap: 6px;
          min-width: 0; overflow-x: auto;
          scrollbar-width: none; -webkit-overflow-scrolling: touch;
          padding: 4px 0;
        }
        .layout-nav-categorias-list::-webkit-scrollbar { display: none; }
        .layout-nav-cat-link {
          display: inline-block;
          padding: 10px 14px; flex-shrink: 0;
          border-radius: 9999px;
          color: #FFFFFF; text-decoration: none;
          font-size: 13px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.02em; white-space: nowrap;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .layout-nav-cat-link:hover {
          color: #FFFFFF;
          background: rgba(255,255,255,0.1);
        }
        .layout-nav-cat-link.active {
          color: #FFFFFF;
          font-weight: 600;
          background: rgba(255,255,255,0.18);
        }

        .nav-mobile-toggle {
          display: flex; padding: 6px; color: var(--text);
          background: transparent; border: none; border-radius: 8px; cursor: pointer;
        }
        .layout-nav-link {
          color: var(--text-muted); text-decoration: none;
          font-size: 0.875rem; font-weight: 500;
          padding: 6px 0; transition: color 0.15s;
        }
        .layout-nav-link.active { color: var(--primary); font-weight: 600; }

        .mobile-menu-overlay {
          position: fixed; inset: 0; top: 92px; z-index: 49;
          background: rgba(0,0,0,0.3);
          animation: layoutFadeIn 0.15s ease;
        }
        .mobile-menu {
          background: var(--surface); padding: 12px 16px;
          display: flex; flex-direction: column; gap: 8px;
          border-bottom: 1px solid var(--border);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .mobile-menu .layout-nav-link {
          padding: 12px 8px; font-size: 0.95rem; border-radius: 8px;
        }
        .mobile-menu .layout-nav-link:hover { background: var(--border-light); }
        .mobile-menu-categorias {
          display: flex; flex-direction: column; gap: 4px;
          padding-top: 8px; border-top: 1px solid var(--border);
        }
        .mobile-menu-categorias-title {
          font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
          color: var(--text-muted); letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .mobile-menu-cat-link {
          padding: 10px 12px;
          color: var(--text); text-decoration: none;
          font-size: 0.9rem; border-radius: 8px;
          background: var(--border-light);
        }
        .mobile-menu-cat-link:hover { background: var(--border); color: var(--primary); }
        @keyframes layoutFadeIn { from { opacity: 0 } to { opacity: 1 } }

        .layout-footer {
          background: #0f172a; color: #cbd5e1;
          padding: 2rem 0; margin-top: 2rem;
        }
        .footer-grid {
          display: grid; grid-template-columns: 1fr; gap: 24px;
        }
        .layout-footer-logo { height: 40px; width: auto; margin-bottom: 12px; opacity: 0.9; }
        .footer-desc {
          font-size: 0.85rem; line-height: 1.5; max-width: 320px;
        }
        .footer-title {
          color: white; font-weight: 700; margin-bottom: 8px;
          font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase;
        }
        .footer-info-row {
          display: flex; align-items: flex-start; gap: 8px; font-size: 0.8rem;
        }
        .footer-icon { color: var(--primary); flex-shrink: 0; }
        .footer-links { list-style: none; }
        .footer-links li { margin-bottom: 8px; }
        .footer-links a { color: #cbd5e1; text-decoration: none; }
        .footer-links a:hover { color: white; text-decoration: underline; }
        .footer-copy {
          border-top: 1px solid #1e293b; margin-top: 24px; padding-top: 16px;
          text-align: center; font-size: 0.75rem; color: #64748b;
        }

        @media (max-width: 767px) {
          .layout-search-form { max-width: 160px; }
          .layout-search-input { padding: 8px 36px 8px 10px; font-size: 0.85rem; }
        }
        @media (min-width: 768px) {
          .layout-header-inner { height: 72px; }
          .layout-logo { height: 52px; }
          .layout-header-nav { display: flex !important; }
          .layout-search-form { margin: 0 16px; max-width: 480px; }
          .nav-mobile-toggle { display: none !important; }
          .layout-nav-bar { display: block !important; }
          .footer-grid { grid-template-columns: repeat(3, 1fr); gap: 40px; }
          .layout-footer { padding: 2.5rem 0; }
          .footer-copy { margin-top: 40px; padding-top: 24px; font-size: 0.8rem; }
        }
      `}</style>
    </div>
  )
}
