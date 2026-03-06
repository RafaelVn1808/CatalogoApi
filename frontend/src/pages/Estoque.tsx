import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Search, Pencil, Power, Eye, EyeOff, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { produtosApi } from '@/api/produtos'
import { categoriasApi } from '@/api/categorias'
import { importacaoApi } from '@/api/importacao'
import type { ProdutoListDto, CategoriaDto, ImportacaoCsvResultDto } from '@/types/api'

const TAMANHO_PAGINA = 12

export default function Estoque() {
  const [itens, setItens] = useState<ProdutoListDto[]>([])
  const [categorias, setCategorias] = useState<CategoriaDto[]>([])
  const [busca, setBusca] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [statusDisponibilidade, setStatusDisponibilidade] = useState<'todos' | 'disponivel' | 'indisponivel'>('todos')
  const [statusAtivo, setStatusAtivo] = useState<'todos' | 'ativos' | 'inativos'>('todos')
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [error, setError] = useState('')
  const [arquivoImportacao, setArquivoImportacao] = useState<File | null>(null)
  const [importando, setImportando] = useState(false)
  const [resultadoImportacao, setResultadoImportacao] = useState<ImportacaoCsvResultDto | null>(null)
  const [somenteEstoqueImportacao, setSomenteEstoqueImportacao] = useState(true)
  const [criarNovosImportacao, setCriarNovosImportacao] = useState(false)
  const [apenasCodigoCategoriaImportacao, setApenasCodigoCategoriaImportacao] = useState(false)

  const prevFiltrosRef = useRef({ busca, categoriaId, statusDisponibilidade, statusAtivo })

  const idsDaPagina = itens.map((i) => i.id)
  const todosDaPaginaSelecionados = idsDaPagina.length > 0 && idsDaPagina.every((id) => selecionados.has(id))
  const algunsDaPaginaSelecionados = idsDaPagina.some((id) => selecionados.has(id))

  function estaDisponivel(p: ProdutoListDto) {
    return p.lojasDisponiveis.length > 0
  }

  useEffect(() => {
    categoriasApi.listar().then((r) => setCategorias(r.data)).catch(() => setCategorias([]))
  }, [])

  async function carregarLista() {
    setLoading(true)
    setError('')
    try {
      const r = await produtosApi.listar({
        pagina,
        tamanho: TAMANHO_PAGINA,
        busca: busca || undefined,
        categoriaId: categoriaId === '' ? undefined : categoriaId,
        ativo: statusAtivo === 'todos' ? undefined : statusAtivo === 'ativos',
        disponivel: statusDisponibilidade === 'todos' ? undefined : statusDisponibilidade === 'disponivel',
        incluirInativos: true,
        ordenarPor: 'Nome',
        ordenarDirecao: 'asc',
      })
      setItens(r.data.itens)
      setTotal(r.data.total)
      setTotalPaginas(r.data.totalPaginas)
    } catch {
      setError('Erro ao carregar estoque.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const prev = prevFiltrosRef.current
    const filtroMudou =
      prev.busca !== busca ||
      prev.categoriaId !== categoriaId ||
      prev.statusDisponibilidade !== statusDisponibilidade ||
      prev.statusAtivo !== statusAtivo
    prevFiltrosRef.current = { busca, categoriaId, statusDisponibilidade, statusAtivo }

    if (filtroMudou) setSelecionados(new Set())
    carregarLista()
  }, [pagina, busca, categoriaId, statusDisponibilidade, statusAtivo])

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

  async function executarEmLote(
    ids: number[],
    acao: (id: number) => Promise<void>,
    sucesso: string,
    erro: string
  ) {
    if (ids.length === 0) return
    setProcessando(true)
    setError('')
    try {
      await Promise.all(ids.map((id) => acao(id)))
      setSelecionados(new Set())
      carregarLista()
    } catch {
      setError(erro)
    } finally {
      setProcessando(false)
    }
  }

  const selArr = Array.from(selecionados)

  async function handleImportarPlanilha(e: React.FormEvent) {
    e.preventDefault()
    if (!arquivoImportacao) return
    setImportando(true)
    setResultadoImportacao(null)
    try {
      const { data } = await importacaoApi.importarEstoque(arquivoImportacao, {
        somenteEstoque: somenteEstoqueImportacao,
        criarNovos: criarNovosImportacao,
        apenasCodigoCategoria: apenasCodigoCategoriaImportacao,
      })
      setResultadoImportacao(data)
      await carregarLista()
    } catch (err: unknown) {
      const responseData = (err as { response?: { data?: ImportacaoCsvResultDto | { message?: string } } })?.response?.data
      if (responseData && typeof responseData === 'object' && 'erros' in responseData) {
        setResultadoImportacao(responseData as ImportacaoCsvResultDto)
      } else {
        setError((responseData as { message?: string })?.message ?? 'Erro ao importar planilha.')
      }
    } finally {
      setImportando(false)
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
      <h1 style={{ marginBottom: '1.5rem' }}>Estoque</h1>

      {/* Importação */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>Importar planilha</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
          Formatos aceitos: .csv, .txt, .xlsx e .xls (Excel 97-2003).
        </p>
        <form onSubmit={handleImportarPlanilha} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="file" accept=".csv,.txt,.xlsx,.xls" onChange={(e) => setArquivoImportacao(e.target.files?.[0] ?? null)} />
          <button type="submit" className="btn btn-primary" disabled={!arquivoImportacao || importando}>
            {importando ? 'Importando...' : 'Importar planilha'}
          </button>
        </form>
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={apenasCodigoCategoriaImportacao} onChange={(e) => { setApenasCodigoCategoriaImportacao(e.target.checked); if (e.target.checked) { setSomenteEstoqueImportacao(false); setCriarNovosImportacao(false) } }} />
            Só código e categoria (planilha &quot;Listagem de produtos&quot; — vincula categorias por código extraído de &quot;77 - NOME&quot;)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={somenteEstoqueImportacao} disabled={apenasCodigoCategoriaImportacao} onChange={(e) => { setSomenteEstoqueImportacao(e.target.checked); if (e.target.checked) setCriarNovosImportacao(false) }} />
            Somente estoque (não altera dados de vitrine)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={criarNovosImportacao} disabled={somenteEstoqueImportacao || apenasCodigoCategoriaImportacao} onChange={(e) => setCriarNovosImportacao(e.target.checked)} />
            Criar produtos novos automaticamente quando não encontrados
          </label>
        </div>
        {resultadoImportacao && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            {resultadoImportacao.totalLinhasNoArquivo != null && <p><strong>Linhas no arquivo:</strong> {resultadoImportacao.totalLinhasNoArquivo}</p>}
            <p><strong>Linhas processadas:</strong> {resultadoImportacao.linhasProcessadas}</p>
            <p><strong>Produtos criados:</strong> {resultadoImportacao.produtosCriados}</p>
            <p><strong>Produtos atualizados:</strong> {resultadoImportacao.produtosAtualizados}</p>
            <p><strong>Não encontrados / pendentes:</strong> {resultadoImportacao.produtosNaoEncontrados}</p>
            {(resultadoImportacao.linhasIgnoradasNomeVazio ?? 0) > 0 && <p style={{ color: 'var(--text-muted)' }}><strong>Ignoradas (nome vazio):</strong> {resultadoImportacao.linhasIgnoradasNomeVazio}</p>}
            {(resultadoImportacao.linhasIgnoradasPrecoInvalido ?? 0) > 0 && <p style={{ color: 'var(--text-muted)' }}><strong>Ignoradas (preço inválido):</strong> {resultadoImportacao.linhasIgnoradasPrecoInvalido}</p>}
            {resultadoImportacao.pendencias.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <p style={{ marginBottom: '0.25rem', color: 'var(--text)' }}>Pendências:</p>
                <ul style={{ marginLeft: '1rem' }}>
                  {resultadoImportacao.pendencias.slice(0, 8).map((p, i) => <li key={`${p}-${i}`} style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{p}</li>)}
                </ul>
                {resultadoImportacao.pendencias.length > 8 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>...e mais {resultadoImportacao.pendencias.length - 8} pendência(s).</p>}
              </div>
            )}
            {resultadoImportacao.erros.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <p className="error-msg" style={{ marginBottom: '0.25rem' }}>Erros encontrados:</p>
                <ul style={{ marginLeft: '1rem' }}>
                  {resultadoImportacao.erros.slice(0, 8).map((er, i) => <li key={`${er}-${i}`} style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{er}</li>)}
                </ul>
                {resultadoImportacao.erros.length > 8 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>...e mais {resultadoImportacao.erros.length - 8} erro(s).</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'stretch' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(1) }}
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>
        <select value={categoriaId === '' ? '' : categoriaId} onChange={(e) => { setCategoriaId(e.target.value === '' ? '' : Number(e.target.value)); setPagina(1) }} style={{ ...inputStyle, flex: '0 1 180px' }}>
          <option value="">Categoria</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={statusDisponibilidade} onChange={(e) => { setStatusDisponibilidade(e.target.value as 'todos' | 'disponivel' | 'indisponivel'); setPagina(1) }} style={{ ...inputStyle, flex: '0 1 170px' }}>
          <option value="todos">Disponibilidade</option>
          <option value="disponivel">Disponíveis</option>
          <option value="indisponivel">Indisponíveis</option>
        </select>
        <select value={statusAtivo} onChange={(e) => { setStatusAtivo(e.target.value as 'todos' | 'ativos' | 'inativos'); setPagina(1) }} style={{ ...inputStyle, flex: '0 1 140px' }}>
          <option value="todos">Status</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </select>
      </div>

      {/* Barra de ações em lote */}
      {selecionados.size > 0 && (
        <div style={{
          display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.6rem 1rem', marginBottom: '0.75rem',
          background: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: 10,
        }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--primary)' }}>
            {selecionados.size} selecionado(s)
            <button type="button" onClick={() => setSelecionados(new Set())} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>Limpar</button>
          </span>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-action btn-action-sm" disabled={processando} onClick={() => executarEmLote(selArr, (id) => produtosApi.atualizarAtivo(id, true), 'Ativados.', 'Falha.')}>
              <CheckCircle size={14} /> Ativar
            </button>
            <button type="button" className="btn-action btn-action-sm" disabled={processando} onClick={() => executarEmLote(selArr, (id) => produtosApi.atualizarAtivo(id, false), 'Inativados.', 'Falha.')}>
              <XCircle size={14} /> Inativar
            </button>
            <button type="button" className="btn-action btn-action-sm" disabled={processando} onClick={() => executarEmLote(selArr, (id) => produtosApi.atualizarEstoque(id, [{ lojaId: 1, disponivel: true }]).then(() => {}), 'Disponíveis.', 'Falha.')}>
              <Eye size={14} /> Disponível
            </button>
            <button type="button" className="btn-action btn-action-sm" disabled={processando} onClick={() => executarEmLote(selArr, (id) => produtosApi.atualizarEstoque(id, [{ lojaId: 1, disponivel: false }]).then(() => {}), 'Indisponíveis.', 'Falha.')}>
              <EyeOff size={14} /> Indisponível
            </button>
            <button type="button" className="btn-action btn-action-sm btn-action-danger" disabled={processando} onClick={() => { if (window.confirm('Excluir selecionados?')) executarEmLote(selArr, (id) => produtosApi.excluir(id).then(() => {}), 'Excluídos.', 'Falha.') }}>
              <Trash2 size={14} /> Excluir
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        {total} produto(s) encontrado(s)
      </div>

      {error && <p className="error-msg">{error}</p>}
      {loading && <div className="loading">Carregando...</div>}

      {!loading && !error && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {itens.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>Nenhum item encontrado.</p>
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
                  <th style={{ padding: '0.65rem 0.75rem' }}>Produto</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Código</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Status</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Disponível</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Preço</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => {
                  const disp = estaDisponivel(item)
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <input type="checkbox" checked={selecionados.has(item.id)} onChange={() => toggleSelecao(item.id)} />
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 500 }}>{item.nome}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{item.codigo ?? '—'}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <span className={`badge ${item.ativo ? 'badge-success' : 'badge-muted'}`}>
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <span className={`badge ${disp ? 'badge-info' : 'badge-warn'}`}>
                          {disp ? 'Disponível' : 'Indisponível'}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <Link to={`/produtos/${item.id}/editar`} className="btn-action" title="Editar"><Pencil size={15} /></Link>
                          <button type="button" className="btn-action" title={item.ativo ? 'Inativar' : 'Ativar'} disabled={processando} onClick={() => executarEmLote([item.id], (id) => produtosApi.atualizarAtivo(id, !item.ativo), 'Atualizado.', 'Falha.')}>
                            <Power size={15} />
                          </button>
                          <button type="button" className="btn-action" title={disp ? 'Marcar indisponível' : 'Marcar disponível'} disabled={processando} onClick={() => executarEmLote([item.id], (id) => produtosApi.atualizarEstoque(id, [{ lojaId: 1, disponivel: !disp }]).then(() => {}), 'Atualizado.', 'Falha.')}>
                            {disp ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                          <button type="button" className="btn-action btn-action-danger" title="Excluir" disabled={processando} onClick={() => { if (window.confirm(`Excluir "${item.nome}"?`)) executarEmLote([item.id], (id) => produtosApi.excluir(id).then(() => {}), 'Excluído.', 'Falha.') }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0 2rem' }}>
          <button type="button" className="btn btn-ghost" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Página {pagina} de {totalPaginas}</span>
          <button type="button" className="btn btn-ghost" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Próxima</button>
        </div>
      )}
    </div>
  )
}
