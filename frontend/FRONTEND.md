# Frontend — Catálogo (React + Vite + TypeScript)

Este documento descreve **detalhadamente** tudo que foi implementado no frontend que consome a **CatalagoApi**.

---

## 1. Stack e configuração

| Item | Escolha |
|------|--------|
| **Build** | Vite 5 |
| **Framework** | React 18 |
| **Linguagem** | TypeScript |
| **Roteamento** | react-router-dom v6 |
| **HTTP** | Axios |
| **Estado global (auth)** | React Context |

- **Porta do dev:** 5173 (Vite).
- **Proxy:** Em desenvolvimento, requisições para `/api`, `/swagger`, `/health` e `/ready` são redirecionadas para `http://localhost:5291` (backend). A API deve estar rodando nessa porta (perfil `http` no launchSettings) ou altere o `target` em `vite.config.ts` para a URL do backend.
- **Swagger pelo frontend:** Acesse `http://localhost:5173/swagger` para abrir a UI do Swagger via proxy.
- **Produção:** Defina `VITE_API_URL` com a URL base da API antes do build (veja `.env.example`).

Arquivos principais de configuração:

- `vite.config.ts` — alias `@/` → `src/`, proxy para a API.
- `tsconfig.json` / `tsconfig.app.json` — `baseUrl` e `paths` para `@/*`.
- `package.json` — scripts: `npm run dev`, `npm run build`, `npm run preview`.

---

## 2. Estrutura de pastas

```
frontend/
├── public/
├── src/
│   ├── api/              # Cliente HTTP e módulos por recurso
│   │   ├── client.ts     # Axios + interceptors (JWT, refresh)
│   │   ├── auth.ts
│   │   ├── produtos.ts
│   │   ├── categorias.ts
│   │   ├── lojas.ts
│   │   ├── estoque.ts
│   │   └── index.ts
│   ├── components/
│   │   └── Layout.tsx    # Cabeçalho com nav + Outlet
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Produtos.tsx
│   │   ├── ProdutoDetalhe.tsx
│   │   ├── ProdutoForm.tsx   # Criar + editar
│   │   ├── Categorias.tsx
│   │   ├── Lojas.tsx
│   │   └── Estoque.tsx
│   ├── types/
│   │   └── api.ts        # Tipos espelhando os DTOs da API
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── vite.config.ts
└── FRONTEND.md           # Este arquivo
```

---

## 3. Tipos (`src/types/api.ts`)

Tipos TypeScript alinhados aos DTOs da API para uso type-safe em chamadas e estado:

- **Auth:** `LoginRequest`, `TokenResponse`, `RefreshTokenRequest`, `AlterarSenhaRequest`, `RecuperarSenhaRequest`, `RedefinirSenhaRequest`.
- **Categoria:** `CategoriaDto`, `CategoriaCreateDto`, `CategoriaUpdateDto`.
- **Loja:** `LojaDto`, `LojaCreateDto`, `LojaUpdateDto`.
- **Produto:** `ProdutoListDto`, `ProdutoDetalheDto`, `ProdutoCreateDto`, `ProdutoUpdateDto`, `DisponibilidadeLojaDto`, `EstoqueLojaDto`.
- **Paginação:** `PaginacaoResponse<T>`.
- **Estoque:** `EstoqueItemDto`.

Nomes e campos seguem o JSON da API (camelCase quando a API retorna em camelCase).

---

## 4. Cliente HTTP (`src/api/client.ts`)

- **Instância:** `axios.create` com `baseURL` (vazio no dev quando se usa proxy) e `Content-Type: application/json`.
- **Helpers de auth:** O contexto registra no client as funções `getAccessToken`, `getRefreshToken`, `setTokens` e `clearAuth` via `setAuthHelpers`, para evitar import circular e permitir que os interceptors usem o estado de autenticação.

**Request interceptor:**

- Antes de cada requisição, se existir `accessToken` no localStorage (via `getAccessToken`), adiciona o header `Authorization: Bearer <token>`.

**Response interceptor (401):**

- Se a resposta for 401 e a requisição ainda não tiver sido repetida (`_retry`):
  - Se não houver refresh token, limpa auth e rejeita.
  - Se já existir um refresh em andamento, enfileira a requisição atual e, quando o novo access token chegar, repete todas com o novo token.
  - Caso contrário, chama `POST /api/v1/auth/refresh` com o `refreshToken`, atualiza tokens no localStorage e no contexto, e repete a requisição original com o novo access token.
- Qualquer 401 que não seja tratado (ex.: sem refresh) chama `clearAuth` (logout).

Assim, o frontend renova o token automaticamente em 401 e o usuário só é deslogado quando o refresh falha ou não existe.

---

## 5. Módulos de API (`src/api/*.ts`)

Cada módulo expõe funções que retornam promessas das respostas do axios (`.data` é acessado no consumidor).

- **auth.ts:** `login`, `refresh`, `alterarSenha`, `recuperarSenha`, `redefinirSenha`.
- **produtos.ts:** `listar(params?)`, `obter(id)`, `criar(body)`, `atualizar(id, body)`, `excluir(id)`, `atualizarEstoque(id, estoques)`.
- **categorias.ts:** `listar`, `obter(id)`, `criar(body)`, `atualizar(id, body)`, `excluir(id)`.
- **lojas.ts:** `listar`, `obter(id)`, `criar(body)`, `atualizar(id, body)`, `excluir(id)`.
- **estoque.ts:** `listar(params?)`, `porLoja(lojaId, params?)`.

Todos os recursos que exigem autenticação na API passam a enviar o Bearer token graças ao interceptor.

---

## 6. Autenticação (`src/contexts/AuthContext.tsx`)

- **AuthProvider:** Envolve a app e fornece `user`, `loading`, `login`, `logout`.
- **user:** `{ nome, email, role, lojaId }` ou `null`.
- **loading:** `true` enquanto o contexto verifica no mount se já existe usuário/token no localStorage.
- **login(email, senha):** Chama `POST /api/v1/auth/login`, persiste `accessToken`, `refreshToken`, `expiresAt` e um objeto `user` no localStorage, atualiza o estado e retorna `{ ok: true }` ou `{ ok: false, message }`.
- **logout:** Remove tokens e user do localStorage e zera o estado; o interceptor usa `clearAuth` na 401 para o mesmo efeito quando o refresh falha.
- **Persistência:** Recarregar a página mantém o login enquanto os tokens estiverem válidos (e o refresh funcionar quando o access expirar).

O contexto chama `setAuthHelpers` no primeiro efeito para registrar no `api` client as funções de token, para os interceptors.

---

## 7. Rotas e proteção (`src/App.tsx`)

- **Pública:** `/login` — página de login.
- **Protegidas (exigem usuário logado):** todas as rotas filhas de `/` renderizadas pelo `Layout`:
  - `/` → redireciona para `/produtos`.
  - `/produtos` — lista de produtos.
  - `/produtos/novo` — formulário de novo produto.
  - `/produtos/:id` — detalhe do produto.
  - `/produtos/:id/editar` — edição do produto.
  - `/categorias` — CRUD de categorias.
  - `/lojas` — CRUD de lojas.
  - `/estoque` — listagem de estoque (por loja e filtro “apenas com estoque”).
- **ProtectedRoute:** Se `loading` está true, mostra “Carregando...”; se não há `user`, redireciona para `/login`; caso contrário renderiza os filhos (incluindo o `Layout` com menu e `Outlet`).

Qualquer rota desconhecida redireciona para `/`.

---

## 8. Layout (`src/components/Layout.tsx`)

- Cabeçalho com:
  - Links de navegação: Produtos, Categorias, Lojas, Estoque (NavLink com estilo ativo).
  - Nome e email do usuário logado e botão “Sair” (logout).
- Conteúdo: `<Outlet />` para as páginas filhas.

---

## 9. Páginas — o que cada uma faz

### Login (`src/pages/Login.tsx`)

- Formulário: email e senha.
- Submit chama `login(email, senha)` do contexto; em sucesso redireciona para `/produtos`; em erro exibe `message` retornada pela API (ex.: “Email ou senha inválidos”).
- Texto de apoio com credenciais de desenvolvimento (admin@catalago.com / Admin@123).
- Se já estiver logado ou após login bem-sucedido, redireciona para `/produtos`.

### Produtos (`src/pages/Produtos.tsx`)

- Lista paginada de produtos com busca por texto e filtro por categoria.
- Chama `GET /api/v1/produtos` com `busca`, `categoriaId`, `pagina`, `tamanho` (12 por página).
- Carrega categorias uma vez para popular o select.
- Cada item mostra imagem (ou placeholder), nome, preço e categoria; link para `/produtos/:id`.
- Botão “Novo produto” → `/produtos/novo`.
- Navegação “Anterior / Próxima” entre páginas.

### ProdutoDetalhe (`src/pages/ProdutoDetalhe.tsx`)

- `GET /api/v1/produtos/:id` para exibir nome, código, preço, categoria, descrição, imagem e disponibilidade por loja.
- Botões “Editar” (→ `/produtos/:id/editar`) e “Excluir” (confirma e chama `DELETE /api/v1/produtos/:id`, depois redireciona para `/produtos`).

### ProdutoForm (`src/pages/ProdutoForm.tsx`)

- Usado em `/produtos/novo` e `/produtos/:id/editar`.
- **Criar:** campos nome, descrição, preço, código, categoria; opcionalmente estoques por loja (envio em `criar`). Envia `POST /api/v1/produtos` com `ProdutoCreateDto`.
- **Editar:** carrega o produto com `GET /api/v1/produtos/:id`, preenche nome, descrição, preço, código, categoria, URL da imagem, ativo e quantidade por loja. Salva com `PUT /api/v1/produtos/:id` (`ProdutoUpdateDto`) e depois `PUT /api/v1/produtos/:id/estoque` com a lista de `{ lojaId, quantidade }`.

### Categorias (`src/pages/Categorias.tsx`)

- Lista todas as categorias (`GET /api/v1/categorias`).
- “Nova categoria” abre modal com nome e descrição; submit `POST /api/v1/categorias`.
- “Editar” abre modal com dados atuais; submit `PUT /api/v1/categorias/:id`.
- “Excluir” confirma e chama `DELETE /api/v1/categorias/:id`; em erro (ex.: produtos vinculados) exibe mensagem.

### Lojas (`src/pages/Lojas.tsx`)

- Lista lojas (`GET /api/v1/lojas`) em cards com nome, endereço, telefone, WhatsApp, horário.
- “Nova loja” / “Editar” em modal com todos os campos; criar = `POST /api/v1/lojas`, editar = `PUT /api/v1/lojas/:id`.
- “Excluir” confirma e chama `DELETE /api/v1/lojas/:id`.

### Estoque (`src/pages/Estoque.tsx`)

- Filtros: select de loja (ou “Todas”) e checkbox “Apenas com estoque”.
- Chama `GET /api/v1/estoque` (com `lojaId` e `apenasComEstoque`) ou `GET /api/v1/estoque/loja/:id` quando uma loja está selecionada.
- Tabela: produto, código, loja, quantidade.

---

## 10. Estilos (`src/index.css`)

- Variáveis CSS (tema escuro): `--bg`, `--surface`, `--border`, `--text`, `--text-muted`, `--primary`, `--danger`, `--success`.
- Classes utilitárias: `.container`, `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.form-group`, `.card`, `.grid`, `.grid-2`, `.grid-3`, `.error-msg`, `.loading`.
- Layout da app: `.app` em coluna com `min-height: 100vh`; conteúdo principal cresce com `flex: 1`.

Não há biblioteca de componentes; a UI é feita com HTML semântico e essas classes para manter o projeto simples e alinhado à API.

---

## 11. Resumo do que a API consome

| Recurso | Endpoints utilizados |
|---------|----------------------|
| Auth | `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh` (interceptor) |
| Produtos | `GET/POST /api/v1/produtos`, `GET/PUT/DELETE /api/v1/produtos/:id`, `PUT /api/v1/produtos/:id/estoque` |
| Categorias | `GET/POST /api/v1/categorias`, `GET/PUT/DELETE /api/v1/categorias/:id` |
| Lojas | `GET/POST /api/v1/lojas`, `GET/PUT/DELETE /api/v1/lojas/:id` |
| Estoque | `GET /api/v1/estoque`, `GET /api/v1/estoque/loja/:id` |

Não foram implementadas no frontend (podem ser adicionadas depois):

- Alterar senha, recuperar senha, redefinir senha (os endpoints existem na API e em `authApi`).
- Upload de imagem (`POST /api/v1/upload/produto`).
- Importação CSV (`POST /api/v1/importacao/csv`).

---

## 12. Como rodar

1. **Backend:** Na raiz do repositório, subir a API (ex.: `dotnet run --project CatalagoApi` ou `dotnet run --project backend/CatalagoApi` se já tiver movido). Verificar a URL (ex.: https://localhost:7171) e, se diferente, ajustar o `proxy` em `vite.config.ts`.
2. **Frontend:** No diretório `frontend`, instalar dependências e iniciar o dev server:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Acessar `http://localhost:5173`, fazer login (ex.: admin@catalago.com / Admin@123) e usar Produtos, Categorias, Lojas e Estoque.

Build para produção:

```bash
npm run build
```

Arquivos saem em `dist/`. Servir com qualquer servidor estático; em produção configurar `VITE_API_URL` para a URL base da API.

---

Este documento descreve fielmente a implementação atual do frontend e o uso da CatalagoApi.
