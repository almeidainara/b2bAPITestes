# Creditas API Tester

Ferramenta interna de testes de integração B2B da Creditas. Simula o fluxo completo de um parceiro em **ambiente de staging**.

---

## Setup

```bash
# Instalar dependências
yarn

# Iniciar em desenvolvimento
yarn dev

# Build de produção
yarn build
```

Acesse em `http://localhost:5173`.

---

## Configuração inicial

### 1. Configurações Internas (`/settings`)

Configure o token JWT das **APIs internas** (usadas para buscar parceiros):

| Campo | Descrição | Padrão |
|---|---|---|
| Token JWT | Bearer token das APIs internas Creditas | — |
| X-User-Id | ID do usuário | `user-uuid` |
| X-User-Type | Tipo do usuário | `consultant` |
| X-Tenant-Id | Tenant ID | `creditasbr` |

Use o botão **"Testar conexão"** para validar.

### 2. Credenciais de Parceiros (`/credentials`)

Adicione uma ou mais credenciais de parceiros B2B:

- **Nome**: identificação amigável
- **Company ID**: `CPN-XXXXXXXX-...` (opcional, só para referência)
- **Token JWT**: Bearer token usado nas chamadas B2B

A credencial **ativa** (selecionada no seletor do header) é usada em todos os testes.

> O token é armazenado no `localStorage` do navegador. Ao receber um erro `401`, a aplicação solicita um novo token automaticamente.

---

## APIs utilizadas

### APIs Internas (`https://stg-api.creditas.io`)

Usadas na seção **Parceiros**. Requerem o token das configurações internas + headers `X-User-*`.

| Método | Endpoint | Página | Descrição |
|---|---|---|---|
| `GET` | `/partner/companies?limit=200&offset=0` | Partners → Listar | Lista todos os parceiros |
| `GET` | `/partner/companies/{companyId}` | Partners → Por Company ID | Busca parceiro por ID |
| `GET` | `/partner/companies/by-source/{source}` | Partners → Por Source | Busca parceiro por source |

**Headers obrigatórios:**
```
Authorization: Bearer <internal_token>
X-User-Id: <userId>
X-User-Type: <userType>
X-Tenant-Id: <tenantId>
Accept: application/vnd.creditas.v1+json
Content-Type: application/json
```

---

### API B2B Creditas (`https://stg-api.creditas.io/b2b`)

Usadas nos testes de integração. Requerem o token do parceiro ativo.

| Método | Endpoint | Página | Descrição |
|---|---|---|---|
| `GET` | `/borrowers/eligibility` | Elegibilidade | Verifica elegibilidade por CPF e e-mail |
| `POST` | `/offers` | Ofertas → Auto | Cria oferta de crédito auto |
| `GET` | `/offers/{id}` | — | Consulta oferta por ID |
| `GET` | `/simulations` | Ofertas → Home | Simulação de crédito home equity |
| `POST` | `/proposals` | Propostas | Cria proposta (Auto ou Home) |
| `GET` | `/proposals/{id}/inspection-link` | — | Link de vistoria do veículo |

**Header obrigatório:**
```
Authorization: Bearer <partner_token>
Accept: application/vnd.creditas.v1+json
Content-Type: application/json;charset=UTF-8
```

---

## Fluxo de criação automática de proposta

O botão **"Criar proposta automática"** executa o fluxo completo em 3 etapas:

```
1. GET /borrowers/eligibility
       ↓ CPF elegível?
2. POST /offers  (Auto)  ou  GET /simulations  (Home)
       ↓ Oferta/simulação obtida?
3. POST /proposals
       ↓ Proposta criada!
```

### Como usar

1. Selecione o produto (**Auto** ou **Home**) no seletor da página
2. Clique em **"Criar proposta automática"**
3. No drawer que abre:
   - Edite o payload diretamente no editor JSON à esquerda
   - Acompanhe o preview atualizado em tempo real à direita
   - Execute as etapas individualmente (botões **1**, **2**, **3**) ou clique **"Executar tudo"**
4. Cada etapa mostra o request enviado e a response recebida no `ApiPanel`

### Payload padrão pré-preenchido

**Auto:** CPF `70000000001` (aprovação automática no staging), placa `ABC1D23`, dívida `0`.

**Home:** CPF `70000000001`, renda `R$ 8.000`, UF `SP`, prazo `60 meses`.

> **Dica de staging:** CPF começando com `7` → aprovação automática. CPF começando com `2` → recusa automática.

---

## Estrutura do projeto

```
src/
  theme/           # MUI dark theme + tokens Creditas
  services/
    tokenManager   # localStorage: tokens internos e de parceiros
    internalApi    # Axios client para APIs /partner/*
    b2bApi         # Axios client para APIs /b2b/*
  context/
    AppContext      # Estado global: tokens, partner ativo, notificações
  components/
    ApiPanel        # Exibe request + response de cada chamada
    TokenDialog     # Modal de reautenticação (aparece no 401)
    JsonEditor      # Editor JSON editável com validação
    CredentialSelector # Dropdown de credencial ativa
    Layout          # Sidebar + AppBar + banners de status
    NotificationBar # Snackbars de sucesso/erro
  pages/
    Settings        # Token interno + X-User-* headers
    Partners        # Busca por source, companyId, listar todos
    Credentials     # CRUD de credenciais de parceiros
    Eligibility     # Teste do endpoint de elegibilidade
    Offers          # Ofertas (Auto) + Simulações (Home)
    Proposals       # Criação manual + fluxo automático
  types/
    api.ts          # Tipos TypeScript dos schemas da API B2B
    partner.ts      # Tipos dos parceiros e credenciais
```

---

## Tratamento de erros

- Todo erro de API exibe uma **notificação vermelha** no canto inferior direito
- O `ApiPanel` de erros começa **expandido** por padrão para facilitar o debug
- Erro `401` abre automaticamente o **TokenDialog** para atualizar o token
- Após salvar o novo token, a **request original é retentada automaticamente**

---

## Armazenamento local

| Chave localStorage | Conteúdo |
|---|---|
| `creditas_internal_settings` | Token + X-User-* das APIs internas |
| `creditas_partner_credentials` | Array de credenciais de parceiros |
| `creditas_active_credential_id` | ID da credencial de parceiro ativa |
