# 🦁 Fábrica de Leoas

Aplicativo PWA de protocolos de treino feminino para casa.

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- npm (incluso com o Node.js)

## Instalação

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd <nome-da-pasta>

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
# Crie um arquivo .env na raiz com:
VITE_SUPABASE_URL="https://SEU_PROJETO.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sua_anon_key"
VITE_SUPABASE_PROJECT_ID="seu_project_id"

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

O app estará disponível em `http://localhost:8080`.

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build de produção |
| `npm run lint` | Verificação de código com ESLint |
| `npm run test` | Executa os testes |
| `npm run test:watch` | Testes em modo watch |

## Stack

- **React 18** + **TypeScript 5**
- **Vite 5** (bundler)
- **Tailwind CSS v3** (estilização)
- **shadcn/ui** (componentes)
- **Lovable Cloud / Supabase** (auth, banco de dados, edge functions)
- **Stripe** (pagamentos)
