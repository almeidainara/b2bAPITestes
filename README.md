# Creditas B2B API Tester

Ferramenta web interna para testes de integração com a **API B2B da Creditas** em ambiente de **staging**. Simula o fluxo completo de um parceiro — desde autenticação até criação de propostas — com uma interface visual que exibe todos os requests e responses em tempo real.

---

## Tecnologias

| | |
|---|---|
| **Frontend** | React 19 + TypeScript |
| **Build** | Vite 8 |
| **UI** | Material UI v9 (dark mode, tema Creditas) |
| **HTTP** | Axios |
| **Roteamento** | React Router v7 |
| **Gerenciador de pacotes** | Yarn |

---

## Pré-requisitos

- **Node.js** >= 18
- **Yarn** >= 1.22

---

## Como rodar localmente

```bash
# 1. Clone o repositório
git clone https://github.com/almeidainara/b2bAPITestes.git
cd b2bAPITestes

# 2. Instale as dependências
yarn

# 3. Inicie o servidor de desenvolvimento
yarn dev
```

Acesse em **http://localhost:5173**

> O Vite configura automaticamente um proxy reverso para evitar problemas de CORS.
> Todas as chamadas para `/proxy/*` são redirecionadas para os servidores de staging da Creditas.

### Outros comandos

```bash
yarn build      # Build de produção (dist/)
yarn preview    # Preview do build local
yarn lint       # Linting com ESLint
```

---

## Configuração inicial

### 1. Autenticação — `/credentials`

Antes de qualquer teste é necessário autenticar. Existem três formas:

#### Credencial de Parceiro (consumer_key + consumer_secret)
Cole o JSON da credencial do parceiro no formato:
```json
{
  "consumerKey": "sua-consumer-key",
  "consumerSecret": "seu-consumer-secret",
  "name": "Nome do parceiro"
}
```
A aplicação faz login automaticamente em `POST /api/affiliate_clients/tokens` e armazena o token na sessão.

#### Login por E-mail e Senha
Selecione o tipo de usuário e informe as credenciais:
- **Afiliado (portal)** → `POST /api/affiliates/tokens`
- **Consultor (partner)** → `POST /api/consultants/tokens`

#### JWT Manual
Cole diretamente um token JWT já obtido. Selecione o tipo (afiliado ou consultor) para definir o `X-User-Type` nas requisições.

> Todos os dados são armazenados no `localStorage` do navegador.
> O token é renovado automaticamente em caso de erro `401`.

---

### 2. Configurações Internas — `/settings`

Necessário apenas para a seção de **Parceiros**. Configure o JWT das APIs internas:

| Campo | Descrição |
|---|---|
| Token JWT | Bearer token das APIs `/partner/*` |
| X-User-Id | ID do usuário |
| X-User-Type | `consultant` ou `affiliate` |
| X-Tenant-Id | Geralmente `creditasbr` |

---

## Funcionalidades

### Credenciais — `/credentials`

- Login de afiliado (portal) ou consultor (partner) via e-mail e senha
- Login via `consumer_key` + `consumer_secret`
- Cole JWT diretamente com seleção de tipo de usuário
- CRUD de credenciais salvas para reutilização
- Seletor no header para alternar entre credenciais rapidamente
- Auto-refresh de token em erros `401` — sem precisar logar novamente

---

### Parceiros — `/partners`

Consulta a API interna de parceiros (requer JWT interno configurado em `/settings`):

- Listar todos os parceiros cadastrados
- Buscar por **Company ID** (`CPN-XXXXXXXX-...`)
- Buscar por **Source** (identificador alternativo do parceiro)

---

### Elegibilidade — `/eligibility`

Verifica se um CPF é elegível para produtos de crédito:

`GET /b2b/borrowers/eligibility?cpf=...&email=...&productType=...`

- Campos: CPF, e-mail, tipo de produto
- Exibe o resultado de elegibilidade por produto
- Mostra o trace completo da requisição (headers, body, status, tempo)

---

### Ofertas — `/offers`

**Auto Refinancing:**
`POST /b2b/offers` — cria uma oferta de crédito com garantia de veículo

**Home Equity:**
`GET /b2b/simulations` — simula condições de crédito com garantia de imóvel

Exibe as opções de parcelas e prazos disponíveis.

---

### Criar Proposta — `/proposals`

Dois modos de criação:

#### Criação Automática (drawer lateral)
Executa o fluxo completo de forma guiada, passo a passo:

**HOME_REFI:**
```
1. GET /borrowers/eligibility   → verifica elegibilidade
2. POST /proposals              → cria a proposta
```

**AUTO_REFINANCING:**
```
1. GET /borrowers/eligibility   → verifica elegibilidade
2. POST /offers                 → busca oferta
3. POST /proposals              → cria a proposta
```

Recursos:
- Editor JSON editável com preview em tempo real
- CPF válido gerado automaticamente a cada abertura (iniciado com `7` = aprovação automática no staging)
- Campos editáveis para os headers obrigatórios do HOME_REFI (`X-Bacen-Authorized-At`, `X-User-Ip`, `X-User-Agent`)
- Cada etapa pode ser executada individualmente ou tudo de uma vez ("Executar tudo")
- Trace completo de cada chamada exibido ao final

#### Criação Manual
Envio direto de payload customizado via `POST /proposals`. Útil para testar casos específicos ou payloads fora do padrão.

---

### Criação em Lote — `/batch-proposals`

Cria até **6 propostas simultâneas** com dados aleatórios:

- Gera dados realistas aleatórios: nome, gênero, CPF válido, renda, endereço, tipo de imóvel, valor do crédito
- CPFs únicos gerados a cada execução (iniciados com `7`)
- Nomes masculinos/femininos consistentes com o gênero selecionado
- Tabela de status individual por proposta (aguardando / enviando / sucesso / erro)
- Headers obrigatórios configuráveis por linha (`X-Bacen-Authorized-At`, etc.)
- Execução paralela com feedback visual em tempo real

---

### Ver Propostas — `/proposals-list`

Lista todas as propostas do parceiro autenticado:

`GET /b2b/proposals`

- Filtros por **status** e **tipo de produto**
- Paginação
- Tabela com ID, tipo, status, CPF/nome do tomador e data de criação
- Trace da última requisição

---

## Fluxo de Proxy (CORS)

O Vite redireciona as chamadas locais para os servidores de staging:

| Prefixo local | Destino real |
|---|---|
| `/proxy/auth/...` | `https://auth-staging.creditas.com.br/...` |
| `/proxy/b2b/...` | `https://stg-api.creditas.io/b2b/...` |
| `/proxy/partner/...` | `https://stg-api.creditas.io/partner/...` |

---

## Dicas de Staging

| CPF começa com | Resultado |
|---|---|
| `7` | Aprovação automática |
| `2` | Recusa automática |

Os payloads padrão já usam CPFs iniciados em `7` e são gerados com dígitos verificadores válidos.

---

## Armazenamento Local (`localStorage`)

| Chave | Conteúdo |
|---|---|
| `creditas_internal_settings` | JWT + headers das APIs internas |
| `creditas_partner_credentials` | Lista de credenciais salvas |
| `creditas_active_credential_id` | ID da credencial ativa |
| `creditas_session_credential` | Credencial da sessão atual (login rápido) |

---

## Estrutura do Projeto

```
src/
├── components/
│   ├── ApiPanel/           # Exibe request + response de cada chamada
│   ├── CredentialSelector/ # Dropdown de credencial ativa no header
│   ├── JsonEditor/         # Editor JSON com validação
│   ├── Layout/             # Sidebar + AppBar + banners de status
│   ├── NotificationBar/    # Snackbars de sucesso/erro (auto-dismiss 5s)
│   └── TokenDialog/        # Modal de reautenticação no 401
├── context/
│   └── AppContext.tsx      # Estado global: credencial ativa, notificações, token dialog
├── pages/
│   ├── BatchProposals/     # Criação em lote de propostas HOME_REFI
│   ├── Credentials/        # Autenticação e gerenciamento de credenciais
│   ├── Eligibility/        # Teste do endpoint de elegibilidade
│   ├── Offers/             # Ofertas (Auto) e simulações (Home)
│   ├── Partners/           # Consulta de parceiros via API interna
│   ├── Proposals/          # Criação manual e automática de propostas
│   ├── ProposalsList/      # Listagem de propostas do parceiro
│   └── Settings/           # Configuração do JWT interno
├── services/
│   ├── affiliateAuthApi.ts # Login afiliado, consultor e partner_client
│   ├── b2bApi.ts           # Cliente Axios para /b2b/* com auto-retry 401
│   ├── internalApi.ts      # Cliente Axios para /partner/*
│   └── tokenManager.ts     # CRUD de credenciais no localStorage
├── theme/
│   ├── theme.ts            # Configuração MUI dark mode
│   └── tokens.ts           # Cores e tokens de design Creditas
├── types/
│   ├── api.ts              # Tipos dos schemas da API B2B
│   └── partner.ts          # Tipos de credenciais e parceiros
└── utils/
    └── cpf.ts              # Gerador de CPFs válidos para staging
```
