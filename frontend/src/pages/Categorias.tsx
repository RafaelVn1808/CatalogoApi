import { useState, useEffect } from 'react'
import { Search, Pencil, Trash2 } from 'lucide-react'
import { categoriasApi } from '@/api/categorias'
import type { CategoriaDto } from '@/types/api'

const TAMANHO_PAGINA = 10

export default function Categorias() {
  const [lista, setLista] = useState<CategoriaDto[]>([])
  const [listaFiltrada, setListaFiltrada] = useState<CategoriaDto[]>([])
  const [pagina, setPagina] = useState(1)
  const [busca, setBusca] = useState('')
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [limpando, setLimpando] = useState(false)

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

  useEffect(() => {
    const termo = busca.trim().toLowerCase()
    const filtrada = termo.length === 0
      ? lista
      : lista.filter((c) =>
        c.nome.toLowerCase().includes(termo) ||
        (c.descricao ?? '').toLowerCase().includes(termo)
      )
    setListaFiltrada(filtrada)
    setPagina(1)
    setSelecionados(new Set())
  }, [busca, lista])

  const totalPaginas = Math.max(1, Math.ceil(listaFiltrada.length / TAMANHO_PAGINA))
  const inicio = (pagina - 1) * TAMANHO_PAGINA
  const itensPagina = listaFiltrada.slice(inicio, inicio + TAMANHO_PAGINA)
  const idsDaPagina = itensPagina.map((c) => c.id)
  const todosDaPaginaSelecionados = idsDaPagina.length > 0 && idsDaPagina.every((id) => selecionados.has(id))
  const algunsDaPaginaSelecionados = idsDaPagina.some((id) => selecionados.has(id))

  function openCreate() { setModal('create'); setEditId(null); setNome(''); setDescricao(''); setPrioridade(0); setFormError('') }
  function openEdit(c: CategoriaDto) { setModal('edit'); setEditId(c.id); setNome(c.nome); setDescricao(c.descricao ?? ''); setPrioridade(c.prioridade); setFormError('') }
  function closeModal() { setModal(null); setEditId(null) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      if (editId !== null) {
        await categoriasApi.atualizar(editId, { nome, descricao: descricao || undefined, prioridade })
      } else {
        await categoriasApi.criar({ nome, descricao: descricao || undefined, prioridade })
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

  function toggleSelecionarPagina() {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (todosDaPaginaSelecionados) {
        idsDaPagina.forEach((id) => next.delete(id))
      } else {
        idsDaPagina.forEach((id) => next.add(id))
      }
      return next
    })
  }

  function toggleSelecao(id: number) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function excluirSelecionadas() {
    if (selecionados.size === 0) return
    if (!window.confirm(`Excluir ${selecionados.size} categoria(s)?`)) return
    try {
      await Promise.all(Array.from(selecionados).map((id) => categoriasApi.excluir(id)))
      setSelecionados(new Set())
      load()
    } catch {
      setError('Erro ao excluir categorias selecionadas (algumas podem ter produtos vinculados).')
    }
  }

  async function handleLimparInvalidas() {
    if (!window.confirm('Remover categorias com nomes que parecem código (ex.: 00X0, 789...) e colocar os produtos em "Geral"?')) return
    setLimpando(true)
    setError('')
    try {
      const { data } = await categoriasApi.limparInvalidas()
      const msg = data.categoriasRemovidas === 0
        ? 'Nenhuma categoria inválida encontrada.'
        : `Removidas ${data.categoriasRemovidas} categoria(s) inválida(s) e ${data.produtosReatribuidos} produto(s) reatribuído(s) para "Geral".`
      alert(msg)
      load()
    } catch {
      setError('Erro ao limpar categorias inválidas.')
    } finally {
      setLimpando(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '0.55rem 0.75rem',
    border: '1px solid var(--border)',
    borderRadius: 10,
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s',
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>Categorias</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" onClick={handleLimparInvalidas} disabled={limpando}>
            {limpando ? 'Limpando...' : 'Limpar inválidas'}
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreate}>Nova categoria</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          {listaFiltrada.length} categoria(s)
        </span>
      </div>

      {/* Barra de ações em lote */}
      {selecionados.size > 0 && (
        <div style={{
          display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.6rem 1rem', marginBottom: '0.75rem',
          background: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: 10,
        }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--primary)' }}>
            {selecionados.size} selecionada(s)
            <button type="button" onClick={() => setSelecionados(new Set())} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>Limpar</button>
          </span>
          <button type="button" className="btn-action btn-action-sm btn-action-danger" onClick={excluirSelecionadas}>
            <Trash2 size={14} /> Excluir selecionadas
          </button>
        </div>
      )}

      {error && <p className="error-msg">{error}</p>}
      {loading && <div className="loading">Carregando...</div>}

      {!loading && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {listaFiltrada.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>Nenhuma categoria encontrada.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)', background: 'var(--bg)' }}>
                  <th style={{ padding: '0.65rem 0.75rem', width: 40 }}>
                    <input
                      type="checkbox"
                      checked={todosDaPaginaSelecionados}
                      ref={(el) => { if (el) el.indeterminate = !todosDaPaginaSelecionados && algunsDaPaginaSelecionados }}
                      onChange={toggleSelecionarPagina}
                    />
                  </th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Nome</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Descrição</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Prioridade</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {itensPagina.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <input type="checkbox" checked={selecionados.has(c.id)} onChange={() => toggleSelecao(c.id)} />
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 500 }}>{c.nome}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{c.descricao || '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                      {c.prioridade > 0 ? (
                        <span style={{
                          display: 'inline-block', padding: '0.15rem 0.5rem',
                          borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
                          background: 'var(--primary)', color: '#fff',
                        }}>{c.prioridade}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-action" title="Editar" onClick={() => openEdit(c)}><Pencil size={15} /></button>
                        <button type="button" className="btn-action btn-action-danger" title="Excluir" onClick={() => handleExcluir(c)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0 2rem' }}>
          <button type="button" className="btn btn-ghost" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Página {pagina} de {totalPaginas}</span>
          <button type="button" className="btn btn-ghost" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Próxima</button>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: '1rem' }} onClick={closeModal}>
          <div className="card" style={{ maxWidth: '420px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
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
              <div className="form-group">
                <label>Prioridade <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(0 = normal, maior = mais relevante)</span></label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={prioridade}
                  onChange={(e) => setPrioridade(Math.max(0, Math.min(100, Number(e.target.value))))}
                />
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
