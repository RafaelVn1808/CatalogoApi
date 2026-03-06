import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/api/auth'

export default function AlterarSenhaObrigatoria() {
  const { user, clearDeveAlterarSenha, logout } = useAuth()
  const navigate = useNavigate()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!user?.deveAlterarSenha) {
    navigate('/', { replace: true })
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (novaSenha.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.')
      return
    }

    if (novaSenha !== confirmar) {
      setError('As senhas não conferem.')
      return
    }

    setSubmitting(true)
    try {
      await authApi.alterarSenha({ senhaAtual, novaSenha })
      clearDeveAlterarSenha()
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao alterar senha.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        background: 'var(--bg)',
      }}
    >
      <div className="card" style={{ maxWidth: 420, width: '100%' }}>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Alterar senha</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Sua senha precisa ser alterada antes de continuar.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Senha atual</label>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Nova senha</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label>Confirmar nova senha</label>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={submitting}
          >
            {submitting ? 'Alterando...' : 'Alterar senha'}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-ghost"
          style={{ width: '100%', marginTop: '0.75rem' }}
          onClick={logout}
        >
          Sair
        </button>
      </div>
    </div>
  )
}
