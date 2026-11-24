---
title: Stack Tecnológica e Ambientes
tags:
  - pontus
  - arquitetura
  - stack
  - deploy
updated: 2026-11-23
summary: Stack completa do Frontend e Backend, scripts de execução, variáveis de ambiente e configuração de deploy na Vercel e Render.
---

# 🛠️ Stack Tecnológica e Ambientes

Relacionado: [[00-INDEX]] | [[01-Arquitetura/Dominios-DNS-e-Roteamento]]

## 1. Visão Geral da Stack

| Camada | Tecnologias Principais | Hospedagem / Deploy |
| :--- | :--- | :--- |
| **Frontend** (`frontend/`) | Next.js `16.0.10` (App Router), React `19.2`, TypeScript `5`, TailwindCSS `v4`, Radix UI, TanStack React Query `v5`, React Hook Form + Zod, Lucide, Recharts, Leaflet + Google Maps API | **Vercel** (`pnpm`, porta local `3000`) |
| **Backend** (`backend/`) | Node.js `>=22.0.0` (ESM), Fastify `5.2`, Drizzle ORM `0.39` (`pg`), Zod, Pino, Vitest `3`, `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit` | **Render** (`render.yaml`, plano `starter`, região `sao-paulo`, porta local `4001`) |
| **Banco & Auth** | Supabase PostgreSQL + Supabase Auth (`@supabase/supabase-js` v2, `@supabase/ssr`) + Supabase Storage | **Supabase** (`sa-east-1`) |
| **Pagamentos** | Stripe SDK `v22.3.1` (Checkout, Customer Portal, Webhooks, Test Clocks) | **Stripe** |
| **E-mails** | Resend SDK `v6.17.0` (`no-reply@usepontus.com.br`) | **Resend** (Amazon SES `sa-east-1`) |

---

## 2. Variáveis de Ambiente

### Backend (`backend/.env` — validado em `backend/src/config/env.ts`)
- `NODE_ENV`: `development` | `production` | `test` (default: `development`)
- `PORT`: `4001`
- `LOG_LEVEL`: `info`
- `DATABASE_URL`: String Postgres do Supabase Pooler (porta `6543`) — usada pelo pool principal `db`.
- `APP_DATABASE_URL`: String Postgres direta (porta `5432`) — usada para migrations e `appDb` (`withTenantTransaction`).
- `SUPABASE_URL`: URL do projeto Supabase (`https://<id>.supabase.co`).
- `SUPABASE_PUBLISHABLE_KEY`: Chave `anon` pública.
- `SUPABASE_SECRET_KEY`: Chave `service_role` privada (usada no backend para operações admin do Auth e Storage).
- `ALLOWED_ORIGINS`: Origens CORS separadas por vírgula (ex: `http://localhost:3000,https://www.usepontus.com.br,https://app.usepontus.com.br`).
- `FRONTEND_URL`: Base URL para links de e-mail e redirects do Stripe Checkout/Portal.
- `RESEND_API_KEY`: Obrigatória (deve começar com `re_`).
- `CRON_SECRET`: Segredo Bearer para autenticar chamadas ao endpoint `/cron/expire-points`.
- `STRIPE_SECRET_KEY`: Obrigatória em `production` (`sk_live_...` / `sk_test_...`).
- `STRIPE_WEBHOOK_SECRET`: Obrigatória em `production` (`whsec_...`).
- `STRIPE_PRICE_PRO_MENSAL`: Price ID do plano Pro Mensal (`price_...`).
- `STRIPE_PRICE_PRO_ANUAL`: Price ID do plano Pro Anual (`price_...`).
  > **Nota:** `backend/.env.example` lista `STRIPE_PRICE_ESSENCIAL_*`, mas o código atual (`env.ts` e `billing.routes.ts`) utiliza apenas o plano **Pro** (`pro_mensal` e `pro_anual`).

### Frontend (`frontend/.env` — validado em `frontend/src/config/env.client.ts` e `domains.ts`)
- `NEXT_PUBLIC_API_URL`: URL da API Fastify (default: `http://localhost:4001`; em prod: `https://api.usepontus.com.br`).
- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Chave pública `anon` do Supabase.
- `NEXT_PUBLIC_LANDING_URL`: Default `https://www.usepontus.com.br` (vazio em `localhost`).
- `NEXT_PUBLIC_APP_URL`: Default `https://app.usepontus.com.br` (vazio em `localhost`).
- `NEXT_PUBLIC_PUBLIC_TENANT_ID` / `NEXT_PUBLIC_PUBLIC_TENANT_SLUG`: Opcionais para testes locais de tenant público.

---

## 3. Scripts Principais e Deploy

### Comandos de Verificação
- **Backend (`cd backend`)**:
  - `npm run dev` → `tsx watch src/main.ts` (porta `4001`)
  - `npm run check` → `npm run typecheck && npm run lint && npm run test && npm run build`
  - Scripts utilitários de dev: `dev:expire-trial`, `dev:advance-time` (avança Test Clock da Stripe), `dev:reset-env`, `db:seed-test`.
- **Frontend (`cd frontend`)**:
  - `pnpm dev` → `next dev -p 3000`
  - `pnpm check` → `pnpm typecheck && pnpm lint && pnpm build`

### Configuração do Render (`render.yaml`)
- Serviço web `backend`, runtime `node`, região `sao-paulo`, plano `starter`.
- Build: `cd backend && npm install --include=dev && npm run build`
- Start: `cd backend && NODE_ENV=production npm start`
- Healthcheck: `/health`

### Rate Limiting e Segurança HTTP (`backend/src/app.ts`)
- Cabeçalho global `X-Robots-Tag: noindex, nofollow` em todas as respostas da API.
- `@fastify/helmet` global + `@fastify/cors`.
- `@fastify/rate-limit` (janela de 1 minuto):
  - **300 req/min** para requisições identificadas por `x-tenant-id` ou `Authorization: Bearer` (permite múltiplos caixas no mesmo IP de restaurante).
  - **100 req/min** para acessos anônimos por IP.
  - **Allowlist (sem limite)**: `/health`, `/billing/webhook*`, `/webhooks/*`.
