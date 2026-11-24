---
title: Pontus Brain — Índice Principal (MOC)
tags:
  - pontus
  - moc
  - index
updated: 2026-11-23
summary: Ponto de entrada obrigatório para humanos e agentes de IA antes de planejar ou implementar mudanças no repositório Sistema-de-Fidelidade (Pontus).
---

# 🧠 Pontus Brain — Índice Central (`usepontus.com.br`)

> **Instrução para IA:** Leia este índice primeiro. Carregue **apenas** as notas relevantes para a tarefa solicitada pelo usuário para economizar tokens e manter precisão máxima.

## 🏢 Visão Geral do Produto
- **Nome:** **Pontus** (antigo codinome interno: *Fidelizi*).
- **Tagline:** *"A plataforma de fidelidade feita para quem tem restaurante, não para quem tem TI."*
- **Modelo:** SaaS B2B2C multi-tenant para programas de fidelidade em restaurantes/estabelecimentos comerciais (substituição do cartão fidelidade de papel por pontuação via CPF em < 3 segundos).

---

## 🗺️ Mapa de Notas (MOC)

### 01. Arquitetura (`01-Arquitetura/`)
- [[01-Arquitetura/Stack-e-Ambientes|Stack-e-Ambientes]]: Monorepo (`frontend/` Next.js 16 + `backend/` Fastify 5 + Drizzle), Node >= 22, variáveis de ambiente e deploy (Vercel + Render).
- [[01-Arquitetura/Dominios-DNS-e-Roteamento|Dominios-DNS-e-Roteamento]]: Cloudflare DNS (`usepontus.com.br`), separação B2C (`www`) vs B2B (`app`) no `middleware.ts`, subdomínio `api` (Render) e `send` (Resend/SES).
- [[01-Arquitetura/Mapa-de-Modulos|Mapa-de-Modulos]]: Estrutura de pastas do backend (`src/modules/*`, `src/infra/*`, `src/shared/*`) e frontend (`src/app/*`, `src/features/*`).

### 02. Infraestrutura e Integrações (`02-Infra-e-Integracoes/`)
- [[02-Infra-e-Integracoes/Supabase-DB-RLS-Storage|Supabase-DB-RLS-Storage]]: Conexão dupla (`6543` pooler vs `5432` direct), 14 tabelas do Drizzle, status atual do RLS (`withTenantTransaction`), Auth e buckets `tenant-logos` / `tenant-rewards`.
- [[02-Infra-e-Integracoes/Stripe-Billing-e-Planos|Stripe-Billing-e-Planos]]: Trial de 14 dias, plano `Pro` (`pro_mensal`, `pro_anual`), limites (`PlanLimitService`), webhooks com `FOR UPDATE` + idempotência, Test Clocks em dev.
- [[02-Infra-e-Integracoes/Resend-Emails|Resend-Emails]]: Configuração DNS (Amazon SES `sa-east-1`, DKIM, SPF, DMARC), `EmailService` (`no-reply@usepontus.com.br`) e convites de equipe.
- [[02-Infra-e-Integracoes/Tags-SEO-e-Analytics|Tags-SEO-e-Analytics]]: `@vercel/analytics`, OpenGraph, JSON-LD `SoftwareApplication`, Google Site Verification e ausência atual de GTM/GA4/Meta Pixel.

### 03. Regras de Negócio (`03-Regras-de-Negocio/`)
- [[03-Regras-de-Negocio/Pontos-Resgates-e-Expiracao|Pontos-Resgates-e-Expiracao]]: Cálculo de pontos (`points_conversion_real`), carência (`available_at`), validade (`expires_at`), dedução **FIFO** com lock `FOR UPDATE` e cron de expiração (`SKIP LOCKED`).
- [[03-Regras-de-Negocio/Auth-B2B-vs-B2C-e-Roles|Auth-B2B-vs-B2C-e-Roles]]: Isolamento de sessão Lojista vs Consumidor, perfis globais (`consumer_profiles` + LGPD), roles (`admin`, `operador`, `novato`) e bloqueio HTTP `402` (`requireSubscription`).

### 04. Produto e Design (`04-Produto-e-Design/`)
- [[04-Produto-e-Design/Identidade-Visual-e-UI|Identidade-Visual-e-UI]]: Paleta oficial verde/laranja (`#006323`, `#2E9B4F`, `#E8762C`, `#F4FAF6`, `#0D1F16`), fontes `Plus Jakarta Sans` + `Inter` (⚠️ ignorar `DESIGN_SYSTEM.md` legado Teal/Gold).
- [[04-Produto-e-Design/Roadmap-e-Ideias-Futuras|Roadmap-e-Ideias-Futuras]]: Ideias mapeadas (PDV/ERP, NFC na mesa + avaliação valendo 1 ponto, novos canais e melhorias comerciais).

### 05. Operação e Qualidade (`05-Operacao/`)
- [[05-Operacao/Dividas-Tecnicas-e-Auditorias|Dividas-Tecnicas-e-Auditorias]]: Resumo acionável das Due Diligences (P0/P1/P2: RLS `appDb`, CI `npm run check`, Node 22 no CI, clock skew no Stripe).
- [[05-Operacao/Log-de-Sessoes|Log-de-Sessoes]]: Histórico enxuto de decisões e implementações para continuidade entre sessões.
