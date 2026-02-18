# Configuração do Supabase Storage para Imagens

Este guia explica como configurar o Supabase para armazenamento de imagens de produtos na API CatalagoApi.

## Pré-requisitos

- Conta no [Supabase](https://supabase.com)
- Projeto Supabase criado

---

## Passo 1: Obter as credenciais

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto (ou crie um novo)
3. Vá em **Settings** (ícone de engrenagem) → **API**
4. Copie:
   - **Project URL** – URL do projeto (ex: `https://abcdefgh.supabase.co`)
   - **service_role key** – chave secreta com acesso total (⚠️ nunca exponha no frontend)

> **Importante:** Use sempre a **service_role key** para uploads no backend. A chave **anon** é limitada e pensada para uso no cliente.

---

## Passo 2: Criar o bucket de Storage

1. No Dashboard, vá em **Storage** no menu lateral
2. Clique em **New bucket**
3. Configure:
   - **Name:** `imagens-produtos` (o código usa esse nome exato)
   - **Public bucket:** marque como **público** (para URLs de imagens funcionarem sem autenticação)
4. Clique em **Create bucket**

### Políticas de segurança (RLS)

Buckets públicos permitem leitura de arquivos por URL, mas o upload ainda é controlado. Para permitir que sua API faça upload:

1. Em **Storage** → **Policies**, clique no bucket `imagens-produtos`
2. Adicione uma policy para **INSERT** (upload):
   - **Policy name:** Permitir upload via service role
   - **Allowed operation:** INSERT
   - A service_role key já bypassa RLS, então o upload funcionará se a API usar essa chave

Se o bucket for **privado**, será necessário criar policies específicas ou usar URLs assinadas.

---

## Passo 3: Configurar a API

### Opção A: User Secrets (desenvolvimento – recomendado)

Guarde as credenciais sem commitá-las no repositório:

```powershell
cd CatalagoApi
# ou, se a API estiver em backend/:  cd backend/CatalagoApi
dotnet user-secrets set "Supabase:Url" "https://SEU_PROJETO.supabase.co"
dotnet user-secrets set "Supabase:ServiceKey" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Opção B: appsettings.Development.json

Adicione em `appsettings.Development.json`:

```json
{
  "Supabase": {
    "Url": "https://SEU_PROJETO.supabase.co",
    "ServiceKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

> ⚠️ Não comite credenciais reais. Adicione `appsettings.Development.json` ao `.gitignore` se contiver secrets.

### Opção C: Variáveis de ambiente (produção)

Configure no ambiente de produção:

- `Supabase__Url` = URL do projeto
- `Supabase__ServiceKey` = service_role key

---

## Passo 4: Verificar o funcionamento

1. Inicie a API:
   ```bash
   dotnet run
   ```

2. Faça login para obter um token JWT.

3. Envie uma imagem para o endpoint:
   ```bash
   curl -X POST "https://localhost:5001/api/Upload/produto" \
     -H "Authorization: Bearer SEU_TOKEN_JWT" \
     -F "file=@caminho/para/sua/imagem.jpg"
   ```

4. A resposta deve trazer a URL pública da imagem:
   ```json
   { "url": "https://SEU_PROJETO.supabase.co/storage/v1/object/public/imagens-produtos/produtos/uuid.jpg" }
   ```

---

## Estrutura do projeto

- **Bucket:** `imagens-produtos`
- **Pasta:** `produtos/`
- **Formato do arquivo:** `{Guid}.{extensão}` (ex: `a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg`)

### Formatos aceitos

- JPEG, PNG, GIF, WebP
- Tamanho máximo: 5 MB por arquivo

---

## Resumo da configuração

| Configuração   | Valor                            |
|----------------|----------------------------------|
| Seção config   | `Supabase`                       |
| Url            | URL do projeto Supabase         |
| ServiceKey     | service_role key (não a anon)   |
| Bucket         | `imagens-produtos`              |
| Bucket público | Sim (para URLs públicas)        |
