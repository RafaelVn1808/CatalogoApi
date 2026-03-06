import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { produtosApi } from '@/api/produtos'
import { categoriasApi } from '@/api/categorias'
import { uploadApi } from '@/api/upload'
import type { ProdutoCreateDto, ProdutoUpdateDto, EstoqueLojaDto } from '@/types/api'
import type { CategoriaDto } from '@/types/api'

export default function ProdutoForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [categorias, setCategorias] = useState<CategoriaDto[]>([])
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [codigo, setCodigo] = useState('')
  const [imagemUrl, setImagemUrl] = useState('')
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [ativo, setAtivo] = useState(true)
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [disponivelGeral, setDisponivelGeral] = useState(true)
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const previewImageUrl = useMemo(
    () => {
      if (removeImage) return ''
      return selectedImageFile ? URL.createObjectURL(selectedImageFile) : imagemUrl
    },
    [selectedImageFile, imagemUrl, removeImage]
  )

  useEffect(() => {
    return () => {
      if (previewImageUrl && selectedImageFile) URL.revokeObjectURL(previewImageUrl)
    }
  }, [previewImageUrl, selectedImageFile])

  useEffect(() => {
    categoriasApi.listar().then((r) => setCategorias(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    produtosApi
      .obter(Number(id))
      .then((prodRes) => {
        const p = prodRes.data
        setNome(p.nome)
        setDescricao(p.descricao ?? '')
        setPreco(String(p.preco))
        setCodigo(p.codigo ?? '')
        setImagemUrl(p.imagemUrl ?? '')
        setCategoriaId(p.categoria.id)
        setDisponivelGeral(p.lojasDisponiveis.length > 0)
      })
      .catch(() => setError('Produto não encontrado.'))
      .finally(() => setLoading(false))
  }, [id])

  async function uploadImagemSelecionada(): Promise<string | null> {
    if (removeImage) return null
    if (!selectedImageFile) return imagemUrl || null
    setUploadingImage(true)
    try {
      const { data } = await uploadApi.uploadImagemProduto(selectedImageFile)
      setImagemUrl(data.url)
      return data.url
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao enviar imagem.'
      setError(msg)
      return null
    } finally {
      setUploadingImage(false)
    }
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
      const imagemFinal = await uploadImagemSelecionada()
      if (selectedImageFile && !imagemFinal) return

      if (isEdit) {
        const body: ProdutoUpdateDto = {
          ...payload,
          imagemUrl: removeImage ? null : (imagemFinal || undefined),
          ativo,
        }
        await produtosApi.atualizar(Number(id), body)
        const estoqueGlobal: EstoqueLojaDto[] = [{ lojaId: 1, disponivel: disponivelGeral }]
        await produtosApi.atualizarEstoque(Number(id), estoqueGlobal)
      } else {
        const { data: criado } = await produtosApi.criar({
          ...payload,
          estoques: [{ lojaId: 1, disponivel: disponivelGeral }],
        } as ProdutoCreateDto)

        if (imagemFinal) {
          await produtosApi.atualizar(criado.id, {
            ...payload,
            imagemUrl: imagemFinal,
            ativo: true,
          })
        }
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
          <div className="form-group">
            <label>Imagem do produto</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setSelectedImageFile(e.target.files?.[0] ?? null)
                setRemoveImage(false)
              }}
            />
            <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Selecione uma imagem para enviar. O upload acontece ao salvar.
            </p>
            {previewImageUrl && (
              <div style={{ marginTop: '0.75rem', position: 'relative', display: 'inline-block' }}>
                <img
                  src={previewImageUrl}
                  alt="Pré-visualização"
                  style={{ width: '100%', maxWidth: '260px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImageFile(null)
                    setRemoveImage(true)
                    setImagemUrl('')
                  }}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                  title="Remover imagem"
                >
                  &times;
                </button>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Disponibilidade do produto</label>
            <p style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Como o estoque e unificado, este status vale para todas as lojas.
            </p>
            <label
              htmlFor="disp-global"
              style={{
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.9rem',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                cursor: 'pointer',
                background: 'var(--card)',
              }}
            >
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Disponivel no catalogo</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  {disponivelGeral ? 'Produto aparece como disponivel para compra.' : 'Produto aparece como esgotado.'}
                </span>
              </div>
              <input
                id="disp-global"
                type="checkbox"
                checked={disponivelGeral}
                onChange={(e) => setDisponivelGeral(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
            </label>
          </div>
          {isEdit && (
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" id="ativo" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              <label htmlFor="ativo" style={{ marginBottom: 0 }}>Ativo</label>
            </div>
          )}
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting || uploadingImage}>
            {submitting || uploadingImage ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>
    </div>
  )
}
