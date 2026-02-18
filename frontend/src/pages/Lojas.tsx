import { useState, useEffect } from 'react'
import { lojasApi } from '@/api/lojas'
import type { LojaDto } from '@/types/api'

export default function Lojas() {
  const [lista, setLista] = useState<LojaDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [nome, setNome] = useState('')
  const [endereco, setEndereco] = useState('')
  const [telefone, setTelefone] = useState('')
  const [whatsApp, setWhatsApp] = useState('')
  const [horario, setHorario] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  function load() {
    setLoading(true)
    setError('')
    lojasApi
      .listar()
      .then((r) => setLista(r.data))
      .catch(() => setError('Erro ao carregar lojas.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => load(), [])

  function openCreate() {
    setModal('create')
    setEditId(null)
    setNome('')
    setEndereco('')
    setTelefone('')
    setWhatsApp('')
    setHorario('')
    setFormError('')
  }
  function openEdit(l: LojaDto) {
    setModal('edit')
    setEditId(l.id)
    setNome(l.nome)
    setEndereco(l.endereco ?? '')
    setTelefone(l.telefone ?? '')
    setWhatsApp(l.whatsApp ?? '')
    setHorario(l.horario ?? '')
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
    const body = { nome, endereco: endereco || undefined, telefone: telefone || undefined, whatsApp: whatsApp || undefined, horario: horario || undefined }
    try {
      if (editId !== null) {
        await lojasApi.atualizar(editId, body)
      } else {
        await lojasApi.criar(body)
      }
      closeModal()
      load()
    } catch (err: unknown) {
      setFormError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao salvar.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleExcluir(l: LojaDto) {
    if (!window.confirm(`Excluir a loja "${l.nome}"?`)) return
    try {
      await lojasApi.excluir(l.id)
      load()
    } catch {
      setError('Erro ao excluir (pode haver estoque vinculado).')
    }
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>Lojas</h1>
        <button type="button" className="btn btn-primary" onClick={openCreate}>Nova loja</button>
      </div>
      {error && <p className="error-msg">{error}</p>}
      {loading && <div className="loading">Carregando...</div>}
      {!loading && (
        <div className="grid grid-2">
          {lista.map((l) => (
            <div key={l.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem' }}>{l.nome}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => openEdit(l)}>Editar</button>
                  <button type="button" className="btn btn-danger" onClick={() => handleExcluir(l)}>Excluir</button>
                </div>
              </div>
              {l.endereco && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{l.endereco}</p>}
              {l.telefone && <p style={{ fontSize: '0.9rem' }}>Tel: {l.telefone}</p>}
              {l.whatsApp && <p style={{ fontSize: '0.9rem' }}>WhatsApp: {l.whatsApp}</p>}
              {l.horario && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{l.horario}</p>}
            </div>
          ))}
        </div>
      )}
      {!loading && lista.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhuma loja cadastrada.</p>}

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
          <div className="card" style={{ maxWidth: '420px', width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2>{editId !== null ? 'Editar loja' : 'Nova loja'}</h2>
            <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Nome *</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={200} />
              </div>
              <div className="form-group">
                <label>Endereço</label>
                <input value={endereco} onChange={(e) => setEndereco(e.target.value)} maxLength={500} />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input value={telefone} onChange={(e) => setTelefone(e.target.value)} maxLength={20} />
              </div>
              <div className="form-group">
                <label>WhatsApp</label>
                <input value={whatsApp} onChange={(e) => setWhatsApp(e.target.value)} maxLength={20} />
              </div>
              <div className="form-group">
                <label>Horário</label>
                <input value={horario} onChange={(e) => setHorario(e.target.value)} maxLength={200} placeholder="Ex: Seg-Sex 9h-18h" />
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
