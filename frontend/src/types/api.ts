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
  quantidade: number
}

export interface ProdutoListDto {
  id: number
  nome: string
  descricao: string | null
  preco: number
  imagemUrl: string | null
  codigo: string | null
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
  quantidade: number
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

// ---- Estoque ----
export interface EstoqueItemDto {
  produtoId: number
  produtoNome: string
  produtoCodigo: string | null
  lojaId: number
  lojaNome: string
  quantidade: number
}
