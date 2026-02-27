# Licitaly

Plataforma para busca e análise de licitações públicas brasileiras. Agrega oportunidades do PNCP, SESI, SENAI e SENAC em uma interface unificada, com análise por IA para avaliação de compatibilidade, risco e proposta.

## Stack

- **Frontend/Backend**: Next.js 14 (App Router)
- **Banco de dados**: PostgreSQL via Prisma ORM (PgBouncer para serverless)
- **IA**: Anthropic Claude + Google Gemini via LangChain
- **Auth**: HMAC SHA-256 tokens + PBKDF2 (custom, sem NextAuth)
- **Deploy**: Vercel + GitHub Actions para migrações

## Pré-requisitos

- Node.js 18+
- PostgreSQL (ou Supabase/Neon)

## Configuração local

```bash
npm install
```

Crie `.env.local` com as variáveis abaixo:

```env
# Banco de dados
LICITACOES__POSTGRES_URL=postgresql://user:pass@host:6543/db?pgbouncer=true
LICITACOES__POSTGRES_URL_NON_POOLING=postgresql://user:pass@host:5432/db

# Auth
AUTH_SECRET=<string aleatória segura>

# IA
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Email (nodemailer)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_FROM=noreply@example.com
```

```bash
npm run prisma:generate   # Gera o Prisma client
npm run prisma:migrate    # Aplica migrações
npm run dev               # Inicia em localhost:3000
```

## Comandos

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Build de produção
npm run lint             # ESLint
npm run prisma:generate  # Gera Prisma client
npm run prisma:migrate   # Aplica migrações (prisma migrate deploy)
npm run vercel-build     # Build completo para Vercel (migrate + generate + build)
npx tsx scripts/<name>.ts  # Utilitários (ex: carga-historico.ts)
```

## Arquitetura

```
src/
├── app/
│   ├── page.tsx              # Home / busca de licitações
│   ├── dashboard/            # Painel do usuário
│   ├── pipeline/             # Kanban de oportunidades
│   ├── recomendacoes/        # Recomendações por IA
│   ├── monitoramento/        # Pipeline + notificações
│   ├── perfil/               # Perfil da empresa
│   └── api/                  # ~22 endpoints REST
├── services/
│   ├── pncp.ts               # PNCP (principal fonte — gov.br)
│   ├── sistema-s.ts          # SESI + SENAI
│   ├── senac.ts              # SENAC
│   ├── historico.ts          # Contratos históricos
│   └── notificacao-email.ts  # Envio de alertas por email
├── hooks/                    # React hooks (useAuth, useLicitacoes, etc.)
├── lib/                      # Utilitários servidor (prisma, auth, email)
├── components/               # Componentes React
└── types/                    # Interfaces TypeScript
```

## Fontes de dados

| Fonte | API | Cobertura |
|---|---|---|
| PNCP | `pncp.gov.br/api/consulta/v1` | Federal + estados + municípios (Lei 14.133/2021) |
| SESI / SENAI | `sistematransparenciaweb.com.br` | Indústria (Sistema S) |
| SENAC | `sistematransparenciaweb.com.br` | Comércio (Sistema S) |

## Deploy no Vercel

1. Configure as variáveis de ambiente no painel do Vercel (Production + Preview)
2. Use o Build Command: `npm run vercel-build`
3. Migrações são aplicadas automaticamente via GitHub Actions (`.github/workflows/prisma-migrate-and-deploy.yml`)

### Migrações manuais

Se precisar aplicar a migração inicial diretamente:

```bash
psql "$LICITACOES__POSTGRES_URL_NON_POOLING" -f prisma/migrations/0001_init/migration.sql
```
