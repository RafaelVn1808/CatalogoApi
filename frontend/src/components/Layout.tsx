import { useState, useEffect } from 'react'
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
} from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)
  const [categorias, setCategorias] = useState<CategoriaDto[]>([])
  const navigate = useNavigate()
  const location = useLocation()
  const buscaFromUrl = new URLSearchParams(location.search).get('busca') ?? ''
  const [buscaInput, setBuscaInput] = useState(buscaFromUrl)

  const pathname = location.pathname
  const searchParams = new URLSearchParams(location.search)
  const categoriaIdFromUrl = pathname === '/produtos' ? searchParams.get('categoriaId') : null

  useEffect(() => {
    setBuscaInput(buscaFromUrl)
  }, [buscaFromUrl])

  useEffect(() => {
    categoriasApi
      .listar()
      .then((r) => setCategorias(r.data ?? []))
      .catch(() => setCategorias([]))
  }, [])

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

  const isProdutosActive = pathname === '/produtos' && !categoriaIdFromUrl

  const navLinks = (
    <>
      <span className="layout-nav-categorias-label" aria-hidden>
        <Menu size={16} style={{ flexShrink: 0 }} />
        Categorias
      </span>
      <Link
        to="/produtos"
        className={`layout-nav-link ${isProdutosActive ? 'active' : ''}`}
        onClick={fecharMenu}
      >
        Produtos
      </Link>
      <NavLink to="/nossa-loja" className={({ isActive }) => `layout-nav-link ${isActive ? 'active' : ''}`} onClick={fecharMenu}>
        Nossa loja
      </NavLink>
      {categorias.map((c) => (
        <Link
          key={c.id}
          to={`/produtos?categoriaId=${c.id}`}
          className={`layout-nav-link ${pathname === '/produtos' && categoriaIdFromUrl === String(c.id) ? 'active' : ''}`}
          onClick={fecharMenu}
        >
          {c.nome}
        </Link>
      ))}
      {user && (
        <>
          <NavLink to="/categorias" className={({ isActive }) => `layout-nav-link ${isActive ? 'active' : ''}`} onClick={fecharMenu}>
            Categorias
          </NavLink>
          <NavLink to="/lojas" className={({ isActive }) => `layout-nav-link ${isActive ? 'active' : ''}`} onClick={fecharMenu}>
            Lojas
          </NavLink>
          <NavLink to="/estoque" className={({ isActive }) => `layout-nav-link ${isActive ? 'active' : ''}`} onClick={fecharMenu}>
            Estoque
          </NavLink>
        </>
      )}
    </>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Barra utility (estilo Kalunga): Nossas Lojas, Atendimento | Admin/Sair */}
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

            <form className="layout-search-form" onSubmit={handleBuscaSubmit} role="search">
              <input
                type="search"
                name="q"
                className="layout-search-input"
                placeholder="Digite aqui o que você procura"
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

        {/* Barra de categorias (nav em cinza escuro) - desktop */}
        <div className="layout-nav-bar">
          <div className="container layout-nav-bar-inner">{navLinks}</div>
        </div>

        {/* Mobile menu dropdown */}
        {menuAberto && (
          <div className="mobile-menu-overlay" onClick={fecharMenu}>
            <nav className="mobile-menu" onClick={(e) => e.stopPropagation()}>
              {navLinks}
            </nav>
          </div>
        )}
      </header>

      <main style={{ flex: 1, padding: '1rem 0' }}>
        <Outlet />
      </main>

      <footer className="layout-footer">
        <div className="container" style={{ maxWidth: 1280, padding: '0 1rem' }}>
          <div className="footer-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <img src="/logo.png" alt="Grupo Bompreço" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
              </div>
              <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.85rem' }}>
                Tornando sua experiência de compra física mais eficiente e planejada.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h4 className="footer-title">Nossa Loja</h4>
              <div className="footer-info-row">
                <MapPin size={16} className="footer-icon" />
                <span>Rua Silas Pinheiro, 18 - Centro - Anajás - PA</span>
              </div>
              <div className="footer-info-row">
                <Clock size={16} className="footer-icon" />
                <span>Seg-Sex: 08-12h / 14:30-18:30 | Sáb: 08-12h / 15-17h</span>
              </div>
              <div className="footer-info-row">
                <Phone size={16} className="footer-icon" />
                <span>(91) 98403-2611</span>
              </div>
            </div>

            <div>
              <h4 className="footer-title">Links Rápidos</h4>
              <ul style={{ listStyle: 'none' }}>
                <li style={{ marginBottom: 8 }}>
                  <NavLink to="/produtos" style={{ color: 'inherit', textDecoration: 'none', fontSize: '0.85rem' }}>Produtos</NavLink>
                </li>
                <li style={{ marginBottom: 8 }}>
                  <NavLink to="/nossa-loja" style={{ color: 'inherit', textDecoration: 'none', fontSize: '0.85rem' }}>Nossa loja</NavLink>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-copy">
            © {new Date().getFullYear()} Grupo Bom Preço. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      <style>{`
        /* ===== Barra utility (topo, cinza escuro) ===== */
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
        .layout-utility-sep { color: #9ca3af; }
        .layout-utility-text { color: #d1d5db; }
        .layout-utility-right { display: flex; align-items: center; gap: 12px; }
        .layout-utility-user { color: #d1d5db; }
        .layout-utility-btn {
          background: transparent; border: none; color: #e5e7eb;
          cursor: pointer; font-size: inherit; padding: 0;
        }
        .layout-utility-btn:hover { color: white; text-decoration: underline; }

        /* ===== Header principal (superfície acinzentada + busca) ===== */
        .layout-header {
          position: sticky; top: 0; z-index: 50;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .layout-header-inner {
          display: flex; align-items: center; gap: 12px;
          height: 56px;
        }
        .layout-logo { height: 40px; width: auto; object-fit: contain; display: block; flex-shrink: 0; }
        .layout-search-form {
          flex: 1; min-width: 0; max-width: 420px; margin: 0 8px;
          position: relative;
        }
        .layout-search-input {
          width: 100%; padding: 10px 44px 10px 14px;
          border: 1px solid var(--border); border-radius: 10px;
          background: var(--surface); color: var(--text);
          font-size: 0.9rem; outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .layout-search-input::placeholder { color: var(--text-muted); }
        .layout-search-input:focus {
          border-color: var(--accent-search);
          box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.15);
        }
        .layout-search-btn {
          position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
          width: 36px; height: 36px; border: none; border-radius: 8px;
          background: var(--accent-search); color: white;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .layout-search-btn:hover { background: var(--accent-search-hover); }
        .layout-nav-link {
          color: var(--text-muted); text-decoration: none;
          font-size: 0.875rem; font-weight: 500;
          padding: 6px 0; transition: color 0.15s;
        }
        .layout-nav-link.active { color: var(--primary); font-weight: 600; }

        /* Barra de categorias (cinza escuro, estilo Kalunga: label + scroll horizontal) */
        .layout-nav-bar {
          display: none;
          background: var(--nav-bar-bg);
        }
        .layout-nav-bar-inner {
          max-width: 1280px; margin: 0 auto; padding: 0 12px;
          display: flex; align-items: center; flex-wrap: nowrap; gap: 0;
          min-height: 44px;
          overflow-x: auto;
          scrollbar-width: thin;
          -webkit-overflow-scrolling: touch;
        }
        .layout-nav-bar-inner::-webkit-scrollbar { height: 6px; }
        .layout-nav-bar-inner::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
        .layout-nav-categorias-label {
          display: inline-flex; align-items: center; gap: 8px;
          color: #e5e7eb; font-size: 0.875rem; font-weight: 600;
          padding: 10px 14px 10px 0; margin-right: 4px;
          flex-shrink: 0;
          border-right: 1px solid rgba(255,255,255,0.2);
          padding-right: 14px; margin-right: 8px;
        }
        .layout-nav-bar .layout-nav-link {
          color: #e5e7eb; padding: 10px 14px;
          flex-shrink: 0;
        }
        .layout-nav-bar .layout-nav-link:hover { color: white; background: rgba(255,255,255,0.08); }
        .layout-nav-bar .layout-nav-link.active { color: var(--nav-link-active); font-weight: 600; }

        /* Mobile toggle */
        .nav-mobile-toggle {
          display: flex; padding: 6px; color: var(--text);
          background: transparent; border: none; border-radius: 8px; cursor: pointer;
        }

        /* Mobile menu */
        .mobile-menu-overlay {
          position: fixed; inset: 0; top: 92px; z-index: 49;
          background: rgba(0,0,0,0.3);
          animation: fadeIn 0.15s ease;
        }
        .mobile-menu {
          background: var(--surface); padding: 12px 16px;
          display: flex; flex-direction: column; gap: 4px;
          border-bottom: 1px solid var(--border);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .mobile-menu .layout-nav-link {
          padding: 12px 8px; font-size: 0.95rem; border-radius: 8px;
        }
        .mobile-menu .layout-nav-link:hover { background: var(--border-light); }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

        /* ===== Footer ===== */
        .layout-footer {
          background: #0f172a; color: #cbd5e1;
          padding: 2rem 0; margin-top: 2rem;
        }
        .footer-grid {
          display: grid; grid-template-columns: 1fr; gap: 24px;
        }
        .footer-title {
          color: white; font-weight: 700; margin-bottom: 8px;
          font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase;
        }
        .footer-info-row {
          display: flex; align-items: flex-start; gap: 8px; font-size: 0.8rem;
        }
        .footer-icon { color: var(--primary); flex-shrink: 0; }
        .footer-copy {
          border-top: 1px solid #1e293b; margin-top: 24px; padding-top: 16px;
          text-align: center; font-size: 0.75rem; color: #64748b;
        }

        @media (max-width: 767px) {
          .layout-search-form { max-width: 160px; }
          .layout-search-input { padding: 8px 36px 8px 10px; font-size: 0.85rem; }
        }
        /* ===== Desktop (>=768px) ===== */
        @media (min-width: 768px) {
          .layout-header-inner { height: 72px; }
          .layout-logo { height: 52px; }
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
