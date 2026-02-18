import { useState, useEffect } from 'react'
import { categoriasApi } from '@/api/categorias'
import type { CategoriaDto } from '@/types/api'

export default function Categorias() {
  const [lista, setLista] = useState<CategoriaDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  function load() {
    setLoading(true)
    setError('')
    categoriasApi
      .listar()
      .then((r) => setLista(r.data))
      .catch(() => setError('Erro ao carregar categorias.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => load(), [])

  function openCreate() {
    setModal('create')
    setEditId(null)
    setNome('')
    setDescricao('')
    setFormError('')
  }
  function openEdit(c: CategoriaDto) {
    setModal('edit')
    setEditId(c.id)
    setNome(c.nome)
    setDescricao(c.descricao ?? '')
    setFormError('')
  }
  function closeModal() {
    setModal(null)
    setEditId(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      if (editId !== null) {
        await categoriasApi.atualizar(editId, { nome, descricao: descricao || undefined })
      } else {
        await categoriasApi.criar({ nome, descricao: descricao || undefined })
      }
      closeModal()
      load()
    } catch (err: unknown) {
      setFormError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao salvar.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleExcluir(c: CategoriaDto) {
    if (!window.confirm(`Excluir a categoria "${c.nome}"?`)) return
    try {
      await categoriasApi.excluir(c.id)
      load()
    } catch {
      setError('Erro ao excluir (pode haver produtos vinculados).')
    }
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>Categorias</h1>
        <button type="button" className="btn btn-primary" onClick={openCreate}>Nova categoria</button>
      </div>
      {error && <p className="error-msg">{error}</p>}
      {loading && <div className="loading">Carregando...</div>}
      {!loading && (
        <div className="card">
          {lista.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Nenhuma categoria cadastrada.</p>
          ) : (
            <ul style={{ listStyle: 'none' }}>
              {lista.map((c) => (
                <li
                  key={c.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <strong>{c.nome}</strong>
                    {c.descricao && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>— {c.descricao}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-ghost" onClick={() => openEdit(c)}>Editar</button>
                    <button type="button" className="btn btn-danger" onClick={() => handleExcluir(c)}>Excluir</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {modal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            padding: '1rem',
          }}
          onClick={closeModal}
        >
          <div className="card" style={{ maxWidth: '400px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h2>{editId !== null ? 'Editar categoria' : 'Nova categoria'}</h2>
            <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Nome *</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={100} />
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={500} />
              </div>
              {formError && <p className="error-msg">{formError}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar'}</button>
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
