import { useState } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  Menu,
  X,
  MapPin,
  Clock,
  Phone,
  ArrowRight,
} from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)
  const location = useLocation()

  const fecharMenu = () => setMenuAberto(false)

  const navLinks = (
    <>
      <NavLink to="/produtos" className={({ isActive }) => `layout-nav-link ${isActive ? 'active' : ''}`} onClick={fecharMenu}>
        Produtos
      </NavLink>
      <NavLink to="/nossa-loja" className={({ isActive }) => `layout-nav-link ${isActive ? 'active' : ''}`} onClick={fecharMenu}>
        Nossa loja
      </NavLink>
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
      <header className="layout-header">
        <div className="container" style={{ maxWidth: 1280, padding: '0 12px' }}>
          <div className="layout-header-inner">
            <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <img src="/logo.png" alt="Grupo Bompreço" className="layout-logo" />
            </Link>

            <nav className="nav-desktop">{navLinks}</nav>

            <div className="layout-header-actions">
              {user ? (
                <>
                  <span className="layout-user-info">{user.nome}</span>
                  <button type="button" className="btn btn-ghost" onClick={logout}>Sair</button>
                </>
              ) : (
                <Link to="/login" className="btn btn-primary btn-sm-header">Admin</Link>
              )}
            </div>

            <button type="button" className="nav-mobile-toggle" aria-label="Menu" onClick={() => setMenuAberto(!menuAberto)}>
              {menuAberto ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {menuAberto && (
          <div className="mobile-menu-overlay" onClick={fecharMenu}>
            <nav className="mobile-menu" onClick={(e) => e.stopPropagation()}>
              {navLinks}
              <div className="mobile-menu-divider" />
              {user ? (
                <>
                  <span className="mobile-menu-user">{user.nome} ({user.email})</span>
                  <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { logout(); fecharMenu() }}>
                    Sair
                  </button>
                </>
              ) : (
                <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={fecharMenu}>
                  Admin
                </Link>
              )}
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
                <MapPin size={16} style={{ color: '#b91c1c', flexShrink: 0 }} />
                <span>Rua Silas Pinheiro, 18 - Centro - Anajás - PA</span>
              </div>
              <div className="footer-info-row">
                <Clock size={16} style={{ color: '#b91c1c', flexShrink: 0 }} />
                <span>Seg-Sex: 08-12h / 14:30-18:30 | Sáb: 08-12h / 15-17h</span>
              </div>
              <div className="footer-info-row">
                <Phone size={16} style={{ color: '#b91c1c', flexShrink: 0 }} />
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
        /* ===== Header ===== */
        .layout-header {
          position: sticky; top: 0; z-index: 50;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .layout-header-inner {
          display: flex; justify-content: space-between; align-items: center;
          height: 56px;
        }
        .layout-logo { height: 40px; width: auto; object-fit: contain; display: block; }
        .layout-nav-link {
          color: var(--text-muted); text-decoration: none;
          font-size: 0.875rem; font-weight: 500;
          padding: 6px 0; transition: color 0.15s;
        }
        .layout-nav-link.active { color: var(--primary); font-weight: 600; }
        .layout-header-actions { display: none; align-items: center; gap: 10px; }
        .layout-user-info { color: var(--text-muted); font-size: 0.8rem; }
        .btn-sm-header { font-size: 0.8rem; padding: 6px 14px; }

        /* Desktop nav */
        .nav-desktop { display: none; gap: 20px; }

        /* Mobile toggle */
        .nav-mobile-toggle {
          display: flex; padding: 6px; color: var(--text);
          background: transparent; border: none; border-radius: 8px; cursor: pointer;
        }

        /* Mobile menu */
        .mobile-menu-overlay {
          position: fixed; inset: 0; top: 56px; z-index: 49;
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
        .mobile-menu-divider {
          height: 1px; background: var(--border); margin: 4px 0;
        }
        .mobile-menu-user {
          font-size: 0.8rem; color: var(--text-muted); padding: 8px;
        }
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
        .footer-copy {
          border-top: 1px solid #1e293b; margin-top: 24px; padding-top: 16px;
          text-align: center; font-size: 0.75rem; color: #64748b;
        }

        /* ===== Desktop (>=768px) ===== */
        @media (min-width: 768px) {
          .layout-header-inner { height: 72px; }
          .layout-logo { height: 52px; }
          .nav-desktop { display: flex !important; }
          .nav-mobile-toggle { display: none !important; }
          .layout-header-actions { display: flex !important; }
          .footer-grid { grid-template-columns: repeat(3, 1fr); gap: 40px; }
          .layout-footer { padding: 2.5rem 0; }
          .footer-copy { margin-top: 40px; padding-top: 24px; font-size: 0.8rem; }
        }
      `}</style>
    </div>
  )
}
