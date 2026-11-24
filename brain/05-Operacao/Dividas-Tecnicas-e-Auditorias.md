---
title: Dívidas Técnicas e Pendências de Auditoria
tags:
  - pontus
  - operacao
  - auditoria
  - divida-tecnica
updated: 2026-11-24
summary: Estado real e atualizado das dívidas técnicas após a revisão de regressão de 2026-11-24.
---

# 🛠️ Dívidas Técnicas e Pendências de Auditoria

Relacionado: [[00-INDEX]] | [[02-Infra-e-Integracoes/Supabase-DB-RLS-Storage]] | [[02-Infra-e-Integracoes/Stripe-Billing-e-Planos]]

## ✅ Já Resolvidos (Validado em 2026-11-24)
- **CI do Backend e Frontend (`.github/workflows/ci.yml`)**: Ambos usam Node `22` e executam `npm run check` (backend) e `pnpm check` (frontend: `typecheck && lint && build`).
- **Erro de `rules-of-hooks` e ESLint no Frontend**: Corrigidos todos os 12 erros de lint (incluindo hook condicional `useBillingState` em `assinatura-view.tsx`).
- **Lock e ordenação em `syncCheckoutSession` (`stripe.service.ts`)**: Já usa transação com `FOR UPDATE` e `stripeEventTs` (`current_period_start`).
- **Filtro `tenant_id` em `clientes.service.ts`**: Já aplica `AND r.tenant_id` e `AND e.tenant_id` nas queries de resgates e expirações.
- **`requireSubscription` em `configuracoes.routes.ts`**: Decisão intencional documentada no código (permite que tenants bloqueados acessem configurações para regularizar a conta).
- **Teste `rls.test.ts`**: Já renomeado para `tenant-where-filter.test.ts` (sem falsa promessa de RLS).
- **Limpeza do Repositório**: 14 arquivos `.md`/`.txt` legados da raiz e 5 scripts soltos em `backend/src/` removidos; `README.md` e `backend/.env.example` atualizados.

---

## 🔴 Pendências Reais em Aberto

### 1. Defesa em Profundidade com RLS Real (`APP_DATABASE_URL`) — *P1*
- Hoje o isolamento multi-tenant funciona 100% via filtros `WHERE tenant_id = ...` no código, mas a conexão `DATABASE_URL` usa o role `postgres` (`rolbypassrls = true`) e `withTenantTransaction` (`appDb`) não é chamado nas rotas.
- **Quando priorizar**: Antes de escalar para dezenas de clientes pagantes ou passar por auditoria externa de segurança. Configurar uma role Postgres sem `BYPASSRLS` em `APP_DATABASE_URL` e migrar os services para `withTenantTransaction`.

### 2. Fallback de Timestamp Local em `stripe.service.ts` — *P2*
- Em dois caminhos secundários (`createCheckoutSession` limpeza de assinatura cancelada e `JIT Sync`), ainda há gravação de `Math.floor(Date.now() / 1000)` em `stripeSubscriptionLastEventAt`. Risco baixo, mas idealmente usar apenas timestamps originados pela Stripe.

### 3. Next.js 16 `middleware.ts` → `proxy.ts` — *P2*
- O build do Next.js 16 exibe aviso informativo: *"The `middleware` file convention is deprecated. Please use `proxy` instead."* Migração simples quando for conveniente.
