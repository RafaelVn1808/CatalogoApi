import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <div className="loading">Carregando...</div>
  if (user) return <Navigate to="/produtos" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSubmitting(true)
    const { ok, message } = await login(email, senha)
    setSubmitting(false)
    if (ok) {
      navigate('/produtos', { replace: true })
    } else {
      setErro(message ?? 'Erro ao fazer login.')
    }
  }

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '3rem' }}>
      <div className="card">
        <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Entrar</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {erro && <p className="error-msg">{erro}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', marginTop: '0.5rem' }}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Desenvolvimento: admin@catalago.com / Admin@123
        </p>
      </div>
    </div>
  )
}
