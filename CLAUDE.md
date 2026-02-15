# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Licitaly — a platform for searching and analyzing Brazilian public procurement opportunities (licitações). Built with Next.js App Router, PostgreSQL via Prisma, and AI-powered analysis (Anthropic Claude + Google Gemini via LangChain).

## Commands

```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Deploy Prisma migrations
npm run vercel-build     # Full production build (migrate + generate + build)
npx tsx scripts/<name>.ts  # Run utility scripts (e.g., carga-historico.ts)
```

## Architecture

### App Router (`src/app/`)
- **Pages**: `page.tsx` (home/dashboard), `login/`, `cadastro/`, `dashboard/`, `perfil/`, `pipeline/`, `recomendacoes/`, `verificar-email/`
- **API routes** (`src/app/api/`): ~21 REST endpoints including auth (login, registro, logout, me, verificar-email), licitacoes, favoritos, pipeline, dashboard, alertas, perfil-empresa, checklists, and several AI-powered analysis endpoints (analisar-edital, analisar-match, analisar-risco, analisar-mercado, resumir-edital, gerar-proposta, agente-recomendacao)

### Core Layers
- **`src/services/`**: External integrations. `pncp.ts` is the main data source — fetches from Brazil's PNCP API (`pncp.gov.br/api/consulta/v1`) with a scoring-based categorization system (12 business areas, 13 modalities). `historico.ts` handles historical contract queries.
- **`src/hooks/`**: Custom React hooks that encapsulate all client-side data fetching and state management (useAuth, useLicitacoes, useFavoritos, usePipeline, usePerfilEmpresa, useChecklist, useAlertas, useAgenteRecomendacao).
- **`src/lib/`**: Server utilities — `prisma.ts` (singleton with reconnect/retry logic), `auth.ts` (HMAC SHA-256 tokens, PBKDF2 password hashing, session management), `email.ts` (nodemailer), `response.ts` (API response helpers).
- **`src/components/`**: React components (LicitacaoCard, ListaLicitacoes, ModalAnaliseIA, ModalAnaliseMercado, AnaliseRiscoView, ChecklistView, AgenteRecomendacao, etc.).
- **`src/types/`**: TypeScript interfaces organized by domain (licitacao, empresa, usuario, pipeline, historico, checklist, dashboard, analise-risco, alerta, agente-recomendacao, resumo-edital).

### Database (PostgreSQL + Prisma)
Schema at `prisma/schema.prisma` with models: `usuario`, `sessao`, `alerta`, `favorito`, `perfil_empresa`, `historico_contrato`, `pipeline`, `checklist`, `cache_analise_ia`. Uses PgBouncer connection pooling (port 6543) for serverless; direct connection (port 5432) for migrations.

### AI Integration
Uses LangChain with Anthropic Claude and Google Gemini for: match scoring, risk analysis, market analysis, document summarization, proposal generation, and recommendation agent. Results are cached in `cache_analise_ia` to reduce token usage.

## Conventions

- **Language**: Domain terms in Portuguese (licitacao, usuario, perfil_empresa), technical terms in English (pipeline, checklist)
- **Database columns**: snake_case in Portuguese
- **Path alias**: `@/*` maps to `./src/*`
- **Auth**: Custom token-based auth — most API routes call `getUsuarioFromRequest()` from `src/lib/auth.ts`
- **Prisma client**: Always use the singleton from `src/lib/prisma.ts` (handles reconnection and prevents multiple instances in dev)
- **Deployment**: Vercel with GitHub Actions for migrations (`prisma-migrate-and-deploy.yml`)
- **No test suite**: No tests are configured currently
