# CatalagoApi

Sistema de catálogo para lojas físicas, dividido em **backend** (API .NET) e **frontend** (React).

## Estrutura do repositório

| Pasta | Conteúdo |
|-------|----------|
| **backend/** | Testes da API (`CatalagoApi.Tests`). A API (`CatalagoApi`) fica na raiz; para colocá-la dentro de `backend/`, use o script `mover-api-para-backend.ps1` (feche o IDE antes). |
| **frontend/** | Aplicação React + Vite + TypeScript que consome a API |
| **CatalagoApi/** | API ASP.NET Core (backend) — PostgreSQL, JWT, Swagger, health checks |
| **docs/** | Documentação (Supabase, projeto, etc.) |

## Requisitos

- .NET 10 SDK
- PostgreSQL 16+ (ou Supabase)

## Configuração

1. **Banco de dados**: Configure a connection string em `appsettings.json` ou use variáveis de ambiente:
   ```
   ConnectionStrings__DefaultConnection=Host=...;Database=catalago;Username=...;Password=...
   ```

2. **JWT**: Para produção, altere a chave em `appsettings.json`:
   ```
   Jwt__Key=sua-chave-secreta-longa-minimo-32-caracteres
   Jwt__RefreshTokenExpirationDays=7
   ```

3. **Supabase** (para upload de imagens): Configure em `appsettings.json` ou variáveis:
   ```
   Supabase__Url=https://seu-projeto.supabase.co
   Supabase__ServiceKey=sua-service-key
   ```
   Crie o bucket `Imagens-produtos` no Supabase Storage (público para leitura).

## Executar o backend (API)

Na raiz do repositório:

```bash
dotnet run --project CatalagoApi
```

(Se você tiver movido a API para `backend/`, use: `dotnet run --project backend/CatalagoApi`.)

A API estará em `https://localhost:7xxx` (verifique a porta no console).

## Usuário inicial (desenvolvimento)

- **Email:** admin@catalago.com
- **Senha:** Admin@123

## Health checks

| Rota | Descrição |
|------|-----------|
| GET /health | Status geral (app + PostgreSQL) |
| GET /ready | Pronto para receber tráfego (inclui banco) |
| GET /live | Liveness (app respondendo) |

## Endpoints principais (API v1)

Todas as rotas da API estão sob o prefixo **/api/v1/**.

| Método | Rota | Autenticação | Descrição |
|--------|------|--------------|-----------|
| POST | /api/v1/auth/login | Não | Login (retorna accessToken + refreshToken) |
| POST | /api/v1/auth/refresh | Não | Renovar access token com refresh token |
| POST | /api/v1/auth/alterar-senha | Sim | Alterar senha do usuário logado |
| POST | /api/v1/auth/recuperar-senha | Não | Solicitar recuperação de senha (token por email) |
| POST | /api/v1/auth/redefinir-senha | Não | Redefinir senha com token recebido |
| GET | /api/v1/produtos | Não | Listar produtos (busca, categoria, paginação) |
| GET | /api/v1/produtos/{id} | Não | Detalhe do produto |
| POST | /api/v1/produtos | Sim | Criar produto |
| PUT | /api/v1/produtos/{id} | Sim | Atualizar produto |
| DELETE | /api/v1/produtos/{id} | Sim | Excluir produto |
| PUT | /api/v1/produtos/{id}/estoque | Sim | Atualizar estoque por loja |
| GET | /api/v1/categorias | Não | Listar categorias |
| GET | /api/v1/categorias/{id} | Não | Detalhe da categoria |
| POST | /api/v1/categorias | Sim | Criar categoria |
| PUT | /api/v1/categorias/{id} | Sim | Atualizar categoria |
| DELETE | /api/v1/categorias/{id} | Sim | Excluir categoria |
| GET | /api/v1/lojas | Não | Listar lojas |
| GET | /api/v1/lojas/{id} | Não | Detalhe da loja |
| POST | /api/v1/lojas | Sim | Criar loja |
| PUT | /api/v1/lojas/{id} | Sim | Atualizar loja |
| DELETE | /api/v1/lojas/{id} | Sim | Excluir loja |
| POST | /api/v1/upload/produto | Sim | Upload de imagem (form-data: file) |
| GET | /api/v1/estoque | Sim | Listar estoque (query: lojaId, apenasComEstoque) |
| GET | /api/v1/estoque/loja/{id} | Sim | Estoque de uma loja |
| POST | /api/v1/importacao/csv | Sim | Importar produtos e estoque via CSV |

## Documentação OpenAPI (Swagger)

Em desenvolvimento a UI do Swagger fica em:

- **UI:** `https://localhost:7xxx/swagger`
- **JSON:** `https://localhost:7xxx/swagger/v1/swagger.json`

## Rate limiting

A API aplica limite de **100 requisições por minuto** por IP (anon) ou por usuário autenticado. Respostas 429 incluem a mensagem: "Muitas requisições. Tente novamente em instantes."

## Frontend (React)

O frontend que consome esta API está na pasta **`frontend/`**: React + Vite + TypeScript, com login (JWT + refresh token), listagem/cadastro de produtos, categorias, lojas e estoque.

```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`. Documentação detalhada da implementação: **[frontend/FRONTEND.md](frontend/FRONTEND.md)**.

## Testes (backend)

```bash
dotnet test
```

Testes unitários e de integração estão no projeto `backend/CatalagoApi.Tests`.
