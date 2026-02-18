import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <>
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0.75rem 1rem',
        background: 'var(--surface)',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <NavLink to="/produtos" style={({ isActive }) => ({ color: isActive ? 'var(--primary)' : 'var(--text)', fontWeight: isActive ? 600 : 400 })}>
              Produtos
            </NavLink>
            <NavLink to="/categorias" style={({ isActive }) => ({ color: isActive ? 'var(--primary)' : 'var(--text)', fontWeight: isActive ? 600 : 400 })}>
              Categorias
            </NavLink>
            <NavLink to="/lojas" style={({ isActive }) => ({ color: isActive ? 'var(--primary)' : 'var(--text)', fontWeight: isActive ? 600 : 400 })}>
              Lojas
            </NavLink>
            <NavLink to="/estoque" style={({ isActive }) => ({ color: isActive ? 'var(--primary)' : 'var(--text)', fontWeight: isActive ? 600 : 400 })}>
              Estoque
            </NavLink>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {user?.nome} ({user?.email})
            </span>
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Sair
            </button>
          </div>
        </div>
      </header>
      <main style={{ flex: 1, padding: '1.5rem 0' }}>
        <Outlet />
      </main>
    </>
  )
}
