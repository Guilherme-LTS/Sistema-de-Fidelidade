---
title: Mapa de Módulos (Backend e Frontend)
tags:
  - pontus
  - arquitetura
  - modulos
updated: 2026-11-23
summary: Localização exata de cada módulo e responsabilidade no backend Fastify e no frontend Next.js.
---

# 🗂️ Mapa de Módulos (Backend e Frontend)

Relacionado: [[00-INDEX]] | [[01-Arquitetura/Stack-e-Ambientes]]

## 1. Backend (`backend/src/`)

### Infraestrutura (`backend/src/infra/`)
- `auth/supabase-auth.gateway.ts`: Validação de JWT (`getUser`), login para verificação de senha (`verifyPassword`), criação/atualização/deleção de usuários via `SUPABASE_SECRET_KEY`.
- `database/db.ts`: Instâncias Drizzle `db` (`DATABASE_URL`) e `appDb` (`APP_DATABASE_URL`).
- `database/rls.ts`: Helper `withTenantTransaction` que injeta `request.jwt.claims` e `app.current_tenant`.
- `database/schema.ts`: Definição de todas as 14 tabelas e relações do Drizzle ORM.
- `email/email.service.ts` + `templates/invitation.ts`: Singleton do Resend para envio de convites.
- `storage/storage.gateway.ts`: Upload de imagens (`upsert: true`) para buckets do Supabase Storage.

### Middlewares e Helpers Compartilhados (`backend/src/shared/`)
- `security/require-auth.ts`: Autentica lojista/equipe (`tenant_users`) ou usuário `novato` com convite pendente.
- `security/require-consumer-auth.ts`: Autentica consumidor final (não exige vínculo em `tenant_users`).
- `security/require-role.ts`: Restringe acesso por role (`admin`, `operador`, `novato`).
- `security/require-subscription.ts`: Bloqueia mutações (`POST`/`PUT`/`PATCH`/`DELETE`) com **HTTP 402** se o tenant não estiver em `active` ou `trialing` válido (permite `GET`).
- `validators/cpf.ts`: Limpeza e validação matemática de dígitos verificadores de CPF.
- `audit.service.ts`: Helper `logAuditEvent` para gravar na tabela `audit_logs`.

### Módulos de Domínio (`backend/src/modules/`)
| Módulo | Prefixo HTTP | Responsabilidade Principal |
| :--- | :--- | :--- |
| `auth` | `/auth` | `/me` (dados do usuário + limites do plano + lazy init do Stripe Customer), `/change-password`, `/profile`, registro de tenant e aceite de convites. |
| `billing` | `/billing` | Checkout Stripe (`/checkout`), sincronização (`/sync-checkout`), portal de faturamento (`/portal`), troca/cancelamento/retomada de plano e webhook (`/webhook`). |
| `clientes` | `/clientes` | Busca por CPF (local no tenant e global em `consumer_profiles`), cadastro com aceite LGPD, consulta de saldo e extrato. |
| `transacoes` | `/transacoes` | Lançamento de pontos por CPF + valor gasto em R$, cálculo de conversão, carência e expiração. |
| `recompensas` | `/recompensas` | CRUD de prêmios do restaurante + upload de imagem no bucket `tenant-rewards`. |
| `resgates` | `/resgates` | Resgate de prêmio por CPF com lock `FOR UPDATE` no cliente e dedução **FIFO** nas transações. |
| `configuracoes` | `/configuracoes` | Dados do restaurante, logo (`tenant-logos`), regras de pontos (`pointsConversionReal`, carência, validade, `pointName`), horário de funcionamento e links sociais. |
| `usuarios` | `/usuarios` | Gestão de equipe (`tenant_users`) e envio/revogação de convites (`invitations`), respeitando limite de operadores do plano (`PlanLimitService`). |
| `dashboard` | `/dashboard` | KPIs do restaurante, gráficos de pontuação/resgates, top clientes e atividades recentes. |
| `auditoria` | `/auditoria` | Listagem paginada e filtrada de `audit_logs` do tenant. |
| `consumer` | `/consumer` | Portal autenticado do consumidor final (`/dashboard` multi-restaurantes, `/profile`, `/tenant/:slug`). |
| `public` | `/public` | Consulta pública de pontos/extrato por CPF e dados públicos de parceiros. |
| `cron` | `/cron` | Webhook protegido por `CRON_SECRET` para expirar pontos vencidos em background (`SKIP LOCKED`). |

---

## 2. Frontend (`frontend/src/`)

### Grupos de Rotas (`frontend/src/app/`)
- `(public)/`: Landing page (`www.usepontus.com.br`) e páginas públicas.
- `(auth)/`: Telas de autenticação B2B (`/login`, `/cadastro`, `/alterar-senha`, `/confirmacao-pendente`, `/convites`).
- `(admin)/admin/`: Painel B2B do restaurante (`dashboard`, `clientes`, `fidelidade`, `recompensas`, `configuracoes`, `assinatura`, `auditoria`, `equipe`, `perfil`).
- `(consumer)/`: Portal B2C do consumidor final (`/acesso`, `/painel`, `/perfil`).

### Features (`frontend/src/features/`)
Organizadas de forma espelhada aos módulos do backend (`assinatura`, `auditoria`, `auth`, `clientes`, `configuracoes`, `consumer`, `dashboard`, `fidelidade`, `perfil`, `public`, `recompensas`, `resgates`, `usuarios`), contendo componentes de UI, hooks de query/mutation e serviços de chamada à API (`*.api.ts`).
