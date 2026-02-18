import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { produtosApi } from '@/api/produtos'
import { categoriasApi } from '@/api/categorias'
import type { ProdutoListDto } from '@/types/api'
import type { CategoriaDto } from '@/types/api'

export default function Produtos() {
  const [itens, setItens] = useState<ProdutoListDto[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [busca, setBusca] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [categorias, setCategorias] = useState<CategoriaDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const tamanho = 12

  useEffect(() => {
    categoriasApi.listar()
      .then((r) => setCategorias(r.data))
      .catch(() => setCategorias([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    produtosApi
      .listar({
        pagina,
        tamanho,
        busca: busca || undefined,
        categoriaId: categoriaId === '' ? undefined : categoriaId,
      })
      .then((r) => {
        setItens(r.data.itens)
        setTotal(r.data.total)
        setTotalPaginas(r.data.totalPaginas)
      })
      .catch((e) => setError(e.response?.data?.message ?? 'Erro ao carregar produtos.'))
      .finally(() => setLoading(false))
  }, [pagina, busca, categoriaId])

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1>Produtos</h1>
        <Link to="/produtos/novo" className="btn btn-primary">Novo produto</Link>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Buscar por nome ou código..."
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
          style={{ maxWidth: '280px', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', color: 'var(--text)' }}
        />
        <select
          value={categoriaId === '' ? '' : categoriaId}
          onChange={(e) => { setCategoriaId(e.target.value === '' ? '' : Number(e.target.value)); setPagina(1); }}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', color: 'var(--text)', minWidth: '160px' }}
        >
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {error && <p className="error-msg">{error}</p>}
      {loading && <div className="loading">Carregando produtos...</div>}

      {!loading && !error && (
        <>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {total} produto(s) encontrado(s)
          </p>
          <div className="grid grid-3">
            {itens.map((p) => (
              <Link key={p.id} to={`/produtos/${p.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                {p.imagemUrl ? (
                  <img src={p.imagemUrl} alt={p.nome} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.75rem' }} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '1', background: 'var(--border)', borderRadius: '8px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Sem imagem
                  </div>
                )}
                <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{p.nome}</h3>
                <p style={{ color: 'var(--primary)', fontWeight: 600 }}>R$ {p.preco.toFixed(2).replace('.', ',')}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.categoriaNome}</p>
              </Link>
            ))}
          </div>

          {totalPaginas > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost" disabled={pagina <= 1} onClick={() => setPagina((x) => x - 1)}>
                Anterior
              </button>
              <span style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>
                Página {pagina} de {totalPaginas}
              </span>
              <button type="button" className="btn btn-ghost" disabled={pagina >= totalPaginas} onClick={() => setPagina((x) => x + 1)}>
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
