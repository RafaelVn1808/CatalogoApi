import { Outlet, NavLink, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  Menu,
  MapPin,
  Clock,
  Phone,
  ArrowRight,
} from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <div className="container" style={{ maxWidth: 1280, padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 80 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <img
                src="/logo.png"
                alt="Grupo Bompreço"
                style={{ height: 56, width: 'auto', objectFit: 'contain', display: 'block' }}
              />
            </Link>

            <nav
              style={{
                gap: 24,
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-muted)',
              }}
              className="nav-desktop"
            >
              <NavLink
                to="/produtos"
                style={({ isActive }) => ({
                  color: isActive ? '#b91c1c' : 'var(--text-muted)',
                  textDecoration: 'none',
                })}
              >
                Produtos
              </NavLink>
              <NavLink
                to="/nossa-loja"
                style={({ isActive }) => ({
                  color: isActive ? '#b91c1c' : 'var(--text-muted)',
                  textDecoration: 'none',
                })}
              >
                Nossa loja
              </NavLink>
              {user && (
                <>
                  <NavLink
                    to="/categorias"
                    style={({ isActive }) => ({
                      color: isActive ? '#b91c1c' : 'var(--text-muted)',
                      textDecoration: 'none',
                    })}
                  >
                    Categorias
                  </NavLink>
                  <NavLink
                    to="/lojas"
                    style={({ isActive }) => ({
                      color: isActive ? '#b91c1c' : 'var(--text-muted)',
                      textDecoration: 'none',
                    })}
                  >
                    Lojas
                  </NavLink>
                  <NavLink
                    to="/estoque"
                    style={({ isActive }) => ({
                      color: isActive ? '#b91c1c' : 'var(--text-muted)',
                      textDecoration: 'none',
                    })}
                  >
                    Estoque
                  </NavLink>
                </>
              )}
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {user ? (
                <>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {user.nome} ({user.email})
                  </span>
                  <button type="button" className="btn btn-ghost" onClick={logout}>
                    Sair
                  </button>
                </>
              ) : (
                <Link to="/login" className="btn btn-primary">
                  Admin
                </Link>
              )}
            </div>

            <button
              type="button"
              style={{
                padding: 8,
                color: 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                borderRadius: 9999,
                display: 'none',
              }}
              className="nav-mobile-toggle"
              aria-label="Menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, padding: '2rem 0' }}>
        <Outlet />
      </main>

      <footer
        style={{
          background: '#0f172a',
          color: '#cbd5e1',
          padding: '3rem 0',
          marginTop: '3rem',
        }}
      >
        <div className="container" style={{ maxWidth: 1280, padding: '0 1.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(1, 1fr)',
              gap: 48,
            }}
            className="footer-grid"
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                <img
                  src="/logo.png"
                  alt="Grupo Bompreço"
                  style={{ height: 48, width: 'auto', objectFit: 'contain' }}
                />
              </div>
              <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>
                Nossa plataforma foi desenhada para tornar sua experiência de compra física muito mais eficiente e planejada.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h4 style={{ color: 'white', fontWeight: 700, marginBottom: 8, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Nossa Loja
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <MapPin size={20} style={{ color: '#b91c1c', flexShrink: 0 }} />
                <span>Rua Silas Pinheiro, 18 - Centro - Anajás - PA - 68810-000 </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Clock size={20} style={{ color: '#b91c1c', flexShrink: 0 }} />
                <span>Seg - Sex: 08:00 - 12:00 - 14:30 - 18:30 Sábado 08:00 - 12:00 - 15:00 - 17:00</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Phone size={20} style={{ color: '#b91c1c', flexShrink: 0 }} />
                <span>(91) 98403-2611</span>
              </div>
            </div>

            <div>
              <h4 style={{ color: 'white', fontWeight: 700, marginBottom: 24, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Links Rápidos
              </h4>
              <ul style={{ listStyle: 'none' }}>
                <li style={{ marginBottom: 12 }}>
                  <NavLink to="/produtos" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ArrowRight size={16} style={{ opacity: 0, transition: 'all 0.2s' }} />
                    Produtos
                  </NavLink>
                </li>
                <li style={{ marginBottom: 12 }}>
                  <NavLink to="/nossa-loja" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ArrowRight size={16} style={{ opacity: 0, transition: 'all 0.2s' }} />
                    Nossa loja
                  </NavLink>
                </li>
                {user && (
                  <>
                    <li style={{ marginBottom: 12 }}>
                      <NavLink to="/categorias" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ArrowRight size={16} style={{ opacity: 0, transition: 'all 0.2s' }} />
                        Categorias
                      </NavLink>
                    </li>
                    <li style={{ marginBottom: 12 }}>
                      <NavLink to="/lojas" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ArrowRight size={16} style={{ opacity: 0, transition: 'all 0.2s' }} />
                        Lojas
                      </NavLink>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid #1e293b',
              marginTop: 48,
              paddingTop: 32,
              textAlign: 'center',
              fontSize: '0.875rem',
              color: '#64748b',
            }}
          >
            © {new Date().getFullYear()} Grupo Bom Preço. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      <style>{`
        .nav-desktop { display: none; }
        .nav-mobile-toggle { display: none; }
        @media (min-width: 768px) {
          .nav-desktop { display: flex !important; }
          .nav-mobile-toggle { display: none !important; }
        }
        @media (max-width: 767px) {
          .nav-mobile-toggle { display: inline-flex !important; }
        }
        @media (min-width: 768px) {
          .footer-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
    </div>
  )
}
