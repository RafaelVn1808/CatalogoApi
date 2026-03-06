/**
 * Tipos que espelham os DTOs da API (CatalagoApi).
 * Mantidos alinhados com o backend para consumo type-safe.
 */

// ---- Auth ----
export interface LoginRequest {
  email: string
  senha: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
  nome: string
  email: string
  role: string
  lojaId: number | null
  deveAlterarSenha: boolean
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface AlterarSenhaRequest {
  senhaAtual: string
  novaSenha: string
}

export interface RecuperarSenhaRequest {
  email: string
}

export interface RedefinirSenhaRequest {
  token: string
  email: string
  novaSenha: string
}

// ---- Categoria ----
export interface CategoriaDto {
  id: number
  nome: string
  descricao: string | null
}

export interface CategoriaCreateDto {
  nome: string
  descricao?: string | null
}

export interface CategoriaUpdateDto {
  nome: string
  descricao?: string | null
}

// ---- Loja ----
export interface LojaDto {
  id: number
  nome: string
  endereco: string | null
  telefone: string | null
  whatsApp: string | null
  horario: string | null
}

export interface LojaCreateDto {
  nome: string
  endereco?: string | null
  telefone?: string | null
  whatsApp?: string | null
  horario?: string | null
}

export interface LojaUpdateDto {
  nome: string
  endereco?: string | null
  telefone?: string | null
  whatsApp?: string | null
  horario?: string | null
}

// ---- Produto ----
export interface DisponibilidadeLojaDto {
  lojaId: number
  lojaNome: string
  lojaWhatsApp: string | null
  disponivel: boolean
}

export interface ProdutoListDto {
  id: number
  nome: string
  descricao: string | null
  preco: number
  imagemUrl: string | null
  codigo: string | null
  ativo: boolean
  categoriaNome: string
  lojasDisponiveis: DisponibilidadeLojaDto[]
}

export interface ProdutoDetalheDto {
  id: number
  nome: string
  descricao: string | null
  preco: number
  imagemUrl: string | null
  codigo: string | null
  categoria: CategoriaDto
  lojasDisponiveis: DisponibilidadeLojaDto[]
}

export interface EstoqueLojaDto {
  lojaId: number
  disponivel: boolean
}

export interface ProdutoCreateDto {
  nome: string
  descricao?: string | null
  preco: number
  codigo?: string | null
  categoriaId: number
  estoques?: EstoqueLojaDto[] | null
}

export interface ProdutoUpdateDto {
  nome: string
  descricao?: string | null
  preco: number
  imagemUrl?: string | null
  codigo?: string | null
  ativo: boolean
  categoriaId: number
}

// ---- Paginação ----
export interface PaginacaoResponse<T> {
  itens: T[]
  total: number
  pagina: number
  tamanho: number
  totalPaginas: number
}

export interface ProdutoListarResponse {
  itens: ProdutoListDto[]
  total: number
  pagina: number
  tamanho: number
  totalPaginas: number
  precoMedio: number | null
}

// ---- Estoque ----
export interface EstoqueItemDto {
  produtoId: number
  produtoNome: string
  produtoCodigo: string | null
  lojaId: number
  lojaNome: string
  disponivel: boolean
  precoVenda: number
}

export interface ImportacaoCsvResultDto {
  linhasProcessadas: number
  produtosCriados: number
  produtosAtualizados: number
  produtosNaoEncontrados: number
  /** Total de linhas de dados no arquivo (excluindo cabeçalho). */
  totalLinhasNoArquivo?: number
  /** Linhas ignoradas por nome do produto vazio. */
  linhasIgnoradasNomeVazio?: number
  /** Linhas ignoradas por preço de venda inválido. */
  linhasIgnoradasPrecoInvalido?: number
  erros: string[]
  pendencias: string[]
  sucesso: boolean
}
