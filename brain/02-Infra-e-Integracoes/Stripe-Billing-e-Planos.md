---
title: Stripe — Billing, Assinaturas e Limites de Plano
tags:
  - pontus
  - infra
  - stripe
  - billing
updated: 2026-11-23
summary: Funcionamento completo da integração com a Stripe — Trial de 14 dias, Plano Pro, Webhooks, Idempotência, Locks e Test Clocks.
---

# 💳 Stripe — Billing, Assinaturas e Limites de Plano

Relacionado: [[00-INDEX]] | [[01-Arquitetura/Stack-e-Ambientes]] | [[02-Infra-e-Integracoes/Supabase-DB-RLS-Storage]]

## 1. Modelo de Planos e Trial (`plan-limit.service.ts`)

Todo restaurante (`tenant`) nasce automaticamente em **Trial de 14 dias**:
- `subscriptionStatus = "trialing"`
- `subscriptionCurrentPeriodEnd = now() + interval '14 days'`

### Tabela de Planos Ativos no Código (`PLAN_LIMITS_MAP`)
| Plano / Estado | Condição (`subscriptionStatus`) | Máx. Operadores | Máx. Clientes | Regulamento Customizado | Mutações na API (`requireSubscription`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Trial** (14 dias) | `trialing` com `subscriptionCurrentPeriodEnd > now()` | **10** (usa limites do `PRO`) | **Ilimitado** (`Infinity`) | Sim (`true`) | ✅ Liberadas |
| **Pro** (Mensal / Anual) | `active` | **10** (`operador` ativos + convites pendentes) | **Ilimitado** (`Infinity`) | Sim (`true`) | ✅ Liberadas |
| **Bloqueado** | `canceled`, `unpaid`, `past_due` ou Trial expirado | **0** | **0** | Não (`false`) | ❌ Bloqueadas com **HTTP 402** (apenas `GET` permitido) |

> **Price IDs mapeados em `billing.routes.ts`**:
> - `pro_mensal` → `env.STRIPE_PRICE_PRO_MENSAL`
> - `pro_anual` → `env.STRIPE_PRICE_PRO_ANUAL`

---

## 2. Arquitetura do `StripeService` (`backend/src/modules/billing/stripe.service.ts`)

### Criação e Deduplicação de Customer (`getOrCreateCustomer`)
1. Adquire lock pessimista de linha no banco (`SELECT ... FROM tenants WHERE id = ... FOR UPDATE`).
2. Verifica se `tenant.stripeCustomerId` já existe.
3. Caso não exista localmente, faz `stripe.customers.search({ query: "metadata['tenantId']:'...'" })` na Stripe para recuperar customer histórico.
4. Em `NODE_ENV === "development"`, cria automaticamente um **Stripe Test Clock** (`stripe.testHelpers.testClocks.create`) atrelado ao customer para permitir simular renovações e fim de trial (`npm run dev:advance-time`).
5. Cria o customer com `idempotencyKey: create-customer-${tenant.id}` e salva `stripeCustomerId` no banco.

### Checkout Session (`createCheckoutSession` — `POST /billing/checkout`)
- Restrito a `role: "admin"`.
- Cancela automaticamente assinaturas `incomplete` órfãs anteriores na Stripe antes de abrir novo checkout.
- Se o restaurante ainda possui dias restantes de Trial local (com mais de 48h restantes, exigência da Stripe), injeta `subscription_data.trial_end` no Checkout para que o lojista cadastre o cartão sem perder os dias grátis restantes.

### Troca de Plano, Cancelamento e Retomada
- **Troca de ciclo (`POST /billing/change-plan`)**: Alterna entre Mensal e Anual. Se a assinatura estiver em `trialing`, usa `proration_behavior: "none"` para evitar cobrança imediata durante o período grátis.
- **Cancelamento (`POST /billing/cancel`)**: Define `cancel_at_period_end: true` na Stripe (o restaurante continua com acesso até o fim do ciclo pago).
- **Retomada (`POST /billing/resume`)**: Reverte `cancel_at_period_end: false` antes do término do período.
- **Portal de Faturamento (`POST /billing/portal`)**: Gera sessão do Stripe Billing Portal para troca de cartão e download de faturas.

---

## 3. Webhooks e Sincronização (`POST /billing/webhook`)

- **Raw Body Buffer**: `billing.routes.ts` registra um `contentTypeParser` customizado para `application/json` que preserva o `Buffer` bruto quando a URL contém `/webhook`, permitindo `stripe.webhooks.constructEvent`.
- **Idempotência**: Todo `event.id` é inserido em `stripe_webhook_events`. Se já existir, o webhook retorna `200 OK` imediatamente sem reprocessar.
- **Ordenação Anti-Corrida (`stripeSubscriptionLastEventAt`)**:
  - Eventos de assinatura comparam `event.created` com `tenant.stripeSubscriptionLastEventAt` sob lock `FOR UPDATE`, descartando webhooks atrasados/fora de ordem.
- **Eventos processados**:
  - `checkout.session.completed`
  - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
  - `invoice.paid`, `invoice.payment_failed`, `invoice.finalized` (populam a tabela `stripe_invoices`)
- **Fallback Síncrono (`POST /billing/sync-checkout`)**: Chamado pelo frontend no retorno do Checkout (`?session_id=...`) para atualizar o status do tenant sem depender da latência do webhook.
