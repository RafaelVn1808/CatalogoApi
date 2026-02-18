import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { produtosApi } from '@/api/produtos'
import { categoriasApi } from '@/api/categorias'
import { lojasApi } from '@/api/lojas'
import type { ProdutoCreateDto, ProdutoUpdateDto, EstoqueLojaDto } from '@/types/api'
import type { CategoriaDto } from '@/types/api'
import type { LojaDto } from '@/types/api'

export default function ProdutoForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [categorias, setCategorias] = useState<CategoriaDto[]>([])
  const [lojas, setLojas] = useState<LojaDto[]>([])
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [codigo, setCodigo] = useState('')
  const [imagemUrl, setImagemUrl] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [estoques, setEstoques] = useState<EstoqueLojaDto[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    categoriasApi.listar().then((r) => setCategorias(r.data)).catch(() => {})
    lojasApi.listar().then((r) => setLojas(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    produtosApi
      .obter(Number(id))
      .then((r) => {
        const p = r.data
        setNome(p.nome)
        setDescricao(p.descricao ?? '')
        setPreco(String(p.preco))
        setCodigo(p.codigo ?? '')
        setImagemUrl(p.imagemUrl ?? '')
        setCategoriaId(p.categoria.id)
        setEstoques(p.lojasDisponiveis.map((l) => ({ lojaId: l.lojaId, quantidade: l.quantidade })))
      })
      .catch(() => setError('Produto não encontrado.'))
      .finally(() => setLoading(false))
  }, [id])

  function getQtd(lojaId: number): number {
    return estoques.find((e) => e.lojaId === lojaId)?.quantidade ?? 0
  }
  function setQtd(lojaId: number, quantidade: number) {
    setEstoques((prev) => {
      const rest = prev.filter((e) => e.lojaId !== lojaId)
      if (quantidade > 0) return [...rest, { lojaId, quantidade }]
      return rest
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const payload = {
      nome,
      descricao: descricao || undefined,
      preco: Number(preco),
      codigo: codigo || undefined,
      categoriaId: categoriaId as number,
    }
    try {
      if (isEdit) {
        const body: ProdutoUpdateDto = {
          ...payload,
          imagemUrl: imagemUrl || undefined,
          ativo,
        }
        await produtosApi.atualizar(Number(id), body)
        await produtosApi.atualizarEstoque(Number(id), estoques)
      } else {
        await produtosApi.criar({
          ...payload,
          estoques: estoques.length > 0 ? estoques : undefined,
        })
      }
      navigate('/produtos', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao salvar.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="loading">Carregando...</div>

  return (
    <div className="container">
      <div style={{ marginBottom: '1rem' }}>
        <Link to={isEdit ? `/produtos/${id}` : '/produtos'}>← {isEdit ? 'Voltar' : 'Produtos'}</Link>
      </div>
      <div className="card" style={{ maxWidth: '560px' }}>
        <h1>{isEdit ? 'Editar produto' : 'Novo produto'}</h1>
        <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
          <div className="form-group">
            <label>Nome *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={200} />
          </div>
          <div className="form-group">
            <label>Descrição</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} maxLength={2000} />
          </div>
          <div className="form-group">
            <label>Preço *</label>
            <input type="number" step="0.01" min="0" value={preco} onChange={(e) => setPreco(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Código</label>
            <input value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={50} />
          </div>
          <div className="form-group">
            <label>Categoria *</label>
            <select value={categoriaId === '' ? '' : categoriaId} onChange={(e) => setCategoriaId(e.target.value === '' ? '' : Number(e.target.value))} required>
              <option value="">Selecione</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          {isEdit && (
            <>
              <div className="form-group">
                <label>URL da imagem</label>
                <input value={imagemUrl} onChange={(e) => setImagemUrl(e.target.value)} maxLength={500} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="ativo" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
                <label htmlFor="ativo" style={{ marginBottom: 0 }}>Ativo</label>
              </div>
              {lojas.length > 0 && (
                <div className="form-group">
                  <label>Estoque por loja</label>
                  {lojas.map((l) => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ minWidth: '120px' }}>{l.nome}</span>
                      <input
                        type="number"
                        min="0"
                        value={getQtd(l.id)}
                        onChange={(e) => setQtd(l.id, Math.max(0, parseInt(e.target.value, 10) || 0))}
                        style={{ width: '80px' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>
    </div>
  )
}
