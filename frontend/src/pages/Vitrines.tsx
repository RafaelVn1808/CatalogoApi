import { useState, useEffect, useRef } from 'react'
import { Pencil, Trash2, Plus, Image, X, ChevronUp, ChevronDown, Search } from 'lucide-react'
import { vitrinessApi } from '@/api/vitrines'
import { produtosApi } from '@/api/produtos'
import type { VitrineDto, VitrineItemDto, ProdutoListDto } from '@/types/api'

type ModalTipo = 'vitrine-create' | 'vitrine-edit' | 'item-create' | 'item-edit' | null

const inputStyle: React.CSSProperties = {
  padding: '0.55rem 0.75rem',
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
}

function formatDatetimeLocal(iso: string | null) {
  if (!iso) return ''
  return iso.slice(0, 16)
}

function toIsoOrNull(val: string): string | null {
  if (!val) return null
  return new Date(val).toISOString()
}

export default function Vitrines() {
  const [vitrines, setVitrines] = useState<VitrineDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [vitrineAberta, setVitrineAberta] = useState<number | null>(null)
  const [modal, setModal] = useState<ModalTipo>(null)

  // Formulário vitrine
  const [vNome, setVNome] = useState('')
  const [vAtiva, setVAtiva] = useState(true)
  const [vInicio, setVInicio] = useState('')
  const [vFim, setVFim] = useState('')
  const [vAutoPlay, setVAutoPlay] = useState(4000)
  const [vEditId, setVEditId] = useState<number | null>(null)
  const [vSubmitting, setVSubmitting] = useState(false)
  const [vError, setVError] = useState('')

  // Formulário item
  const [iImagemUrl, setIImagemUrl] = useState('')
  const [iTitulo, setITitulo] = useState('')
  const [iSubtitulo, setISubtitulo] = useState('')
  const [iLinkUrl, setILinkUrl] = useState('')
  const [iOrdem, setIOrdem] = useState(0)
  const [iAtivo, setIAtivo] = useState(true)
  const [iProdutoId, setIProdutoId] = useState<number | ''>('')
  const [iProdutoNomeSelecionado, setIProdutoNomeSelecionado] = useState('')
  const [iBuscaProduto, setIBuscaProduto] = useState('')
  const [iDropdownAberto, setIDropdownAberto] = useState(false)
  const [iEditId, setIEditId] = useState<number | null>(null)
  const [iVitrineId, setIVitrineId] = useState<number | null>(null)
  const [iSubmitting, setISubmitting] = useState(false)
  const [iError, setIError] = useState('')
  const [uploadando, setUploadando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [produtos, setProdutos] = useState<ProdutoListDto[]>([])

  function load() {
    setLoading(true)
    setError('')
    vitrinessApi
      .listar()
      .then((r) => setVitrines(r.data))
      .catch(() => setError('Erro ao carregar vitrines.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    produtosApi
      .listar({ tamanho: 200 })
      .then((r) => setProdutos(r.data.itens))
      .catch(() => setProdutos([]))
  }, [])

  // ---------- Vitrine Modais ----------
  function openCreateVitrine() {
    setVNome(''); setVAtiva(true); setVInicio(''); setVFim(''); setVAutoPlay(4000)
    setVEditId(null); setVError(''); setModal('vitrine-create')
  }

  function openEditVitrine(v: VitrineDto) {
    setVNome(v.nome); setVAtiva(v.ativa)
    setVInicio(formatDatetimeLocal(v.dataInicio)); setVFim(formatDatetimeLocal(v.dataFim))
    setVAutoPlay(v.autoPlayMs); setVEditId(v.id); setVError(''); setModal('vitrine-edit')
  }

  async function handleSubmitVitrine(e: React.FormEvent) {
    e.preventDefault()
    setVError(''); setVSubmitting(true)
    try {
      const body = { nome: vNome, ativa: vAtiva, dataInicio: toIsoOrNull(vInicio), dataFim: toIsoOrNull(vFim), autoPlayMs: vAutoPlay }
      if (vEditId !== null) await vitrinessApi.atualizar(vEditId, body)
      else await vitrinessApi.criar(body)
      setModal(null); load()
    } catch {
      setVError('Erro ao salvar vitrine.')
    } finally {
      setVSubmitting(false)
    }
  }

  async function handleExcluirVitrine(id: number) {
    if (!window.confirm('Excluir esta vitrine e todos os seus itens?')) return
    try {
      await vitrinessApi.excluir(id)
      if (vitrineAberta === id) setVitrineAberta(null)
      load()
    } catch {
      setError('Erro ao excluir vitrine.')
    }
  }

  // ---------- Item Modais ----------
  function openCreateItem(vitrineId: number) {
    setIImagemUrl(''); setITitulo(''); setISubtitulo(''); setILinkUrl('')
    setIOrdem(0); setIAtivo(true); setIProdutoId('')
    setIProdutoNomeSelecionado(''); setIBuscaProduto(''); setIDropdownAberto(false)
    setIEditId(null); setIVitrineId(vitrineId); setIError(''); setModal('item-create')
  }

  function openEditItem(item: VitrineItemDto) {
    setIImagemUrl(item.imagemUrl); setITitulo(item.titulo ?? ''); setISubtitulo(item.subtitulo ?? '')
    setILinkUrl(item.linkUrl ?? ''); setIOrdem(item.ordem); setIAtivo(item.ativo)
    setIProdutoId(item.produtoId ?? '')
    setIProdutoNomeSelecionado(item.produtoNome ?? ''); setIBuscaProduto(''); setIDropdownAberto(false)
    setIEditId(item.id); setIVitrineId(item.vitrineId)
    setIError(''); setModal('item-edit')
  }

  async function handleUploadImagem(file: File) {
    setUploadando(true)
    try {
      const url = await vitrinessApi.uploadImagem(file)
      setIImagemUrl(url)
    } catch {
      setIError('Erro ao fazer upload da imagem.')
    } finally {
      setUploadando(false)
    }
  }

  async function handleSubmitItem(e: React.FormEvent) {
    e.preventDefault()
    if (!iImagemUrl) { setIError('Faça upload de uma imagem.'); return }
    setIError(''); setISubmitting(true)
    try {
      const produtoId = iProdutoId === '' ? null : Number(iProdutoId)
      const body = {
        imagemUrl: iImagemUrl, produtoId, titulo: iTitulo || null,
        subtitulo: iSubtitulo || null, linkUrl: iLinkUrl || null,
        ordem: iOrdem, ativo: iAtivo,
      }
      if (iEditId !== null) await vitrinessApi.atualizarItem(iEditId, body)
      else await vitrinessApi.adicionarItem(iVitrineId!, body)
      setModal(null); load()
    } catch {
      setIError('Erro ao salvar item.')
    } finally {
      setISubmitting(false)
    }
  }

  async function handleExcluirItem(itemId: number) {
    if (!window.confirm('Excluir este item do carrossel?')) return
    try {
      await vitrinessApi.removerItem(itemId)
      load()
    } catch {
      setError('Erro ao excluir item.')
    }
  }

  async function moverItem(item: VitrineItemDto, delta: number, itens: VitrineItemDto[]) {
    const novaOrdem = item.ordem + delta
    const outro = itens.find((i) => i.ordem === novaOrdem)
    if (!outro) return
    try {
      await vitrinessApi.atualizarItem(item.id, { ...item, produtoId: item.produtoId ?? null, titulo: item.titulo ?? null, subtitulo: item.subtitulo ?? null, linkUrl: item.linkUrl ?? null, ordem: novaOrdem })
      await vitrinessApi.atualizarItem(outro.id, { ...outro, produtoId: outro.produtoId ?? null, titulo: outro.titulo ?? null, subtitulo: outro.subtitulo ?? null, linkUrl: outro.linkUrl ?? null, ordem: item.ordem })
      load()
    } catch {
      setError('Erro ao reordenar item.')
    }
  }

  const isItemModal = modal === 'item-create' || modal === 'item-edit'
  const isVitrineModal = modal === 'vitrine-create' || modal === 'vitrine-edit'

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>Vitrines Promocionais</h1>
        <button type="button" className="btn btn-primary" onClick={openCreateVitrine}>
          <Plus size={16} style={{ marginRight: 4 }} /> Nova vitrine
        </button>
      </div>

      {error && <p className="error-msg">{error}</p>}
      {loading && <div className="loading">Carregando...</div>}

      {!loading && vitrines.length === 0 && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Nenhuma vitrine cadastrada. Clique em "Nova vitrine" para começar.
        </div>
      )}

      {!loading && vitrines.map((v) => {
        const aberta = vitrineAberta === v.id
        const itensOrdenados = [...v.itens].sort((a, b) => a.ordem - b.ordem)
        const agora = new Date()
        const inicio = v.dataInicio ? new Date(v.dataInicio) : null
        const fim = v.dataFim ? new Date(v.dataFim) : null
        const vigenteAgora = v.ativa && (inicio == null || inicio <= agora) && (fim == null || fim >= agora)

        return (
          <div key={v.id} className="card" style={{ marginBottom: '1rem', padding: 0, overflow: 'hidden' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', cursor: 'pointer', background: 'var(--bg)', borderBottom: aberta ? '1px solid var(--border)' : 'none' }}
              onClick={() => setVitrineAberta(aberta ? null : v.id)}
            >
              <span style={{ flex: 1, fontWeight: 600, fontSize: '0.95rem' }}>{v.nome}</span>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: vigenteAgora ? 'var(--primary)' : v.ativa ? '#f59e0b' : 'var(--border)',
                color: vigenteAgora || v.ativa ? '#fff' : 'var(--text-muted)',
              }}>
                {vigenteAgora ? 'ATIVA AGORA' : v.ativa ? 'AGENDADA' : 'INATIVA'}
              </span>
              {v.dataInicio && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {new Date(v.dataInicio).toLocaleDateString('pt-BR')}
                  {v.dataFim ? ` → ${new Date(v.dataFim).toLocaleDateString('pt-BR')}` : ''}
                </span>
              )}
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{v.itens.length} item(s)</span>
              <button type="button" className="btn-action" title="Editar" onClick={(e) => { e.stopPropagation(); openEditVitrine(v) }}><Pencil size={14} /></button>
              <button type="button" className="btn-action btn-action-danger" title="Excluir" onClick={(e) => { e.stopPropagation(); handleExcluirVitrine(v.id) }}><Trash2 size={14} /></button>
            </div>

            {aberta && (
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                  <button type="button" className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={() => openCreateItem(v.id)}>
                    <Plus size={14} style={{ marginRight: 4 }} /> Adicionar item
                  </button>
                </div>

                {itensOrdenados.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>Nenhum item nesta vitrine.</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {itensOrdenados.map((item, idx) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 10, background: item.ativo ? 'var(--surface)' : 'var(--bg)' }}>
                      <img src={item.imagemUrl} alt={item.titulo ?? ''} style={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', truncate: true }}>{item.titulo || <span style={{ color: 'var(--text-muted)' }}>Sem título</span>}</p>
                        {item.produtoNome && <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Produto: {item.produtoNome}</p>}
                        {item.linkUrl && <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.linkUrl}</p>}
                      </div>
                      {!item.ativo && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--border)', borderRadius: 999, padding: '1px 6px' }}>inativo</span>}
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: 24, textAlign: 'center' }}>#{item.ordem}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <button type="button" className="btn-action" disabled={idx === 0} onClick={() => moverItem(item, -1, itensOrdenados)} style={{ padding: '2px 4px' }}><ChevronUp size={13} /></button>
                        <button type="button" className="btn-action" disabled={idx === itensOrdenados.length - 1} onClick={() => moverItem(item, 1, itensOrdenados)} style={{ padding: '2px 4px' }}><ChevronDown size={13} /></button>
                      </div>
                      <button type="button" className="btn-action" title="Editar" onClick={() => openEditItem(item)}><Pencil size={14} /></button>
                      <button type="button" className="btn-action btn-action-danger" title="Excluir" onClick={() => handleExcluirItem(item.id)}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Modal Vitrine */}
      {isVitrineModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: '1rem' }} onClick={() => setModal(null)}>
          <div className="card" style={{ maxWidth: 480, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h2>{vEditId ? 'Editar vitrine' : 'Nova vitrine'}</h2>
            <form onSubmit={handleSubmitVitrine} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group">
                <label>Nome *</label>
                <input value={vNome} onChange={(e) => setVNome(e.target.value)} required maxLength={200} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                  <label>Data início</label>
                  <input type="datetime-local" value={vInicio} onChange={(e) => setVInicio(e.target.value)} style={inputStyle} />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                  <label>Data fim</label>
                  <input type="datetime-local" value={vFim} onChange={(e) => setVFim(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div className="form-group">
                <label>AutoPlay (ms) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>intervalo entre slides</span></label>
                <input type="number" min={1000} max={30000} step={500} value={vAutoPlay} onChange={(e) => setVAutoPlay(Number(e.target.value))} style={inputStyle} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={vAtiva} onChange={(e) => setVAtiva(e.target.checked)} />
                Vitrine ativa
              </label>
              {vError && <p className="error-msg">{vError}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={vSubmitting}>{vSubmitting ? 'Salvando...' : 'Salvar'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Item */}
      {isItemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 10, padding: '1rem', overflowY: 'auto' }} onClick={() => setModal(null)}>
          <div className="card" style={{ maxWidth: 520, width: '100%', margin: '5rem auto auto' }} onClick={(e) => e.stopPropagation()}>
            <h2>{iEditId ? 'Editar item' : 'Novo item'}</h2>
            <form onSubmit={handleSubmitItem} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

              {/* Upload imagem */}
              <div className="form-group">
                <label>Imagem do banner *</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImagem(f) }}
                  />
                  <button type="button" className="btn btn-ghost" style={{ whiteSpace: 'nowrap' }} disabled={uploadando} onClick={() => fileRef.current?.click()}>
                    <Image size={15} style={{ marginRight: 4 }} />
                    {uploadando ? 'Enviando...' : 'Selecionar imagem'}
                  </button>
                  {iImagemUrl && (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={iImagemUrl} alt="preview" style={{ height: 56, width: 90, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                      <button type="button" onClick={() => setIImagemUrl('')} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', padding: 0 }}><X size={11} /></button>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Título <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(exibido sobre a imagem)</span></label>
                <input value={iTitulo} onChange={(e) => setITitulo(e.target.value)} maxLength={200} />
              </div>
              <div className="form-group">
                <label>Subtítulo</label>
                <input value={iSubtitulo} onChange={(e) => setISubtitulo(e.target.value)} maxLength={400} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: 180, position: 'relative' }}>
                  <label>Vincular produto <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></label>
                  {iProdutoId !== '' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.45rem 0.75rem', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' }}>
                      <span style={{ flex: 1, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{iProdutoNomeSelecionado}</span>
                      <button type="button" onClick={() => { setIProdutoId(''); setIProdutoNomeSelecionado(''); setIBuscaProduto('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input
                          value={iBuscaProduto}
                          onChange={(e) => { setIBuscaProduto(e.target.value); setIDropdownAberto(true) }}
                          onFocus={() => setIDropdownAberto(true)}
                          onBlur={() => setTimeout(() => setIDropdownAberto(false), 150)}
                          placeholder="Buscar produto..."
                          style={{ ...inputStyle, paddingLeft: 30 }}
                          autoComplete="off"
                        />
                      </div>
                      {iDropdownAberto && iBuscaProduto.trim().length >= 1 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                          {produtos
                            .filter((p) => p.nome.toLowerCase().includes(iBuscaProduto.toLowerCase()))
                            .slice(0, 8)
                            .map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onMouseDown={() => { setIProdutoId(p.id); setIProdutoNomeSelecionado(p.nome); setIBuscaProduto(''); setIDropdownAberto(false) }}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border-light)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                {p.nome}
                              </button>
                            ))}
                          {produtos.filter((p) => p.nome.toLowerCase().includes(iBuscaProduto.toLowerCase())).length === 0 && (
                            <p style={{ padding: '0.5rem 0.75rem', margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nenhum produto encontrado</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 100 }}>
                  <label>Ordem</label>
                  <input type="number" min={0} value={iOrdem} onChange={(e) => setIOrdem(Number(e.target.value))} style={inputStyle} />
                </div>
              </div>

              <div className="form-group">
                <label>Link customizado <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(sobrepõe o produto)</span></label>
                <input value={iLinkUrl} onChange={(e) => setILinkUrl(e.target.value)} maxLength={500} placeholder="https://... ou /produtos?categoriaId=1" />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={iAtivo} onChange={(e) => setIAtivo(e.target.checked)} />
                Item ativo
              </label>

              {iError && <p className="error-msg">{iError}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={iSubmitting || uploadando}>{iSubmitting ? 'Salvando...' : 'Salvar'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
