---
title: Supabase — Banco de Dados, RLS, Auth e Storage
tags:
  - pontus
  - infra
  - supabase
  - database
  - rls
updated: 2026-11-23
summary: Arquitetura completa do Supabase no Pontus — conexões 6543 vs 5432, schema de 14 tabelas, status real do RLS e buckets de storage.
---

# 🗄️ Supabase — Banco de Dados, RLS, Auth e Storage

Relacionado: [[00-INDEX]] | [[01-Arquitetura/Stack-e-Ambientes]] | [[03-Regras-de-Negocio/Auth-B2B-vs-B2C-e-Roles]]

## 1. Conexões com o PostgreSQL (`backend/src/infra/database/db.ts`)

O backend instancia dois pools do `node-postgres` (`pg`) com Drizzle ORM:
1. **`db` (`DATABASE_URL` — Porta `6543`, Transaction Pooler)**:
   - Pool padrão utilizado pela maioria dos serviços e rotas administrativas/públicas.
2. **`appDb` (`APP_DATABASE_URL` — Porta `5432`, Direct Connection)**:
   - Usado para migrations do Drizzle (`drizzle.config.ts`) e pelo helper `withTenantTransaction` (`backend/src/infra/database/rls.ts`).

---

## 2. Schema Completo (`backend/src/infra/database/schema.ts`)

Total de **14 tabelas**:

### Núcleo B2B (Restaurantes & Equipe)
| Tabela | PK | Campos-Chave e Regras |
| :--- | :--- | :--- |
| `tenants` | `id` (`uuid`) | `name`, `slug` (único), `trading_name`, `document`, `phone`, `email`, endereço + `latitude`/`longitude`, `logo_url`, `regulation_notes`, `point_name` (nome customizado da moeda, ex: "Pontus"), `points_conversion_real` (default `1.00`), `loyalty_grace_period_days` (default `0`), `loyalty_expiration_days` (default `90`), `business_hours` (jsonb), `social_links` (jsonb), campos de billing Stripe (`stripe_customer_id`, `stripe_subscription_id`, `subscription_status` default `'trialing'`, `subscription_current_period_end` default `now() + 14 days`). |
| `tenant_users` | `id` (`uuid`) | Vínculo funcionário ↔ restaurante: `tenant_id` (FK cascade), `user_id` (FK `auth.users.id`), `name`, `phone`, `role` (`admin` \| `operador` \| `novato`), `is_active`, `status` (`active` \| `pending` \| `declined`), `deleted_at` (soft delete). |
| `invitations` | `id` (`uuid`) | Convites de equipe: `tenant_id`, `email`, `role`, `token` (`uuid` único), `status` (`pending` \| `accepted` \| `expired` \| `revoked`), `expires_at`. |

### Núcleo B2C e Fidelidade (Consumidores, Pontos e Resgates)
| Tabela | PK | Campos-Chave e Regras |
| :--- | :--- | :--- |
| `consumer_profiles` | `id` (`uuid`) | **Perfil global do consumidor na plataforma**: `document` (CPF único de 11 dígitos), `auth_user_id` (FK `auth.users.id`, preenchido quando o cliente cria conta no portal B2C), `name`, `phone`, `lgpd_consent`, `consent_date`, `consent_ip`, `consent_user_agent`, `consent_operator_id`. |
| `customers` | `id` (`serial`) | **Vínculo local do consumidor com um restaurante específico**: `tenant_id`, `consumer_profile_id` (FK `consumer_profiles.id`), `deleted_at`. Índice único parcial `idx_customers_tenant_consumer_unique` onde `deleted_at IS NULL`. |
| `transactions` | `id` (`serial`) | Lançamento de pontos: `customer_id`, `tenant_id`, `operator_id`, `amount_spent` (numeric), `points_earned`, `remaining_points` (saldo restante deste lote para FIFO), `available_at`, `expires_at`. |
| `rewards` | `id` (`serial`) | Catálogo de prêmios do tenant: `tenant_id`, `name`, `description`, `image_url`, `points_cost`, `is_active`, `deleted_at`. |
| `redemptions` | `id` (`serial`) | Cabeçalho de resgate: `customer_id`, `reward_id`, `points_spent`, `operator_id`, `tenant_id`. |
| `redemption_items` | `id` (`serial`) | **Ledger FIFO de resgate**: `redemption_id`, `transaction_id`, `points_deducted` (rastreia de qual transação vieram os pontos gastos). |
| `expirations` | `id` (`serial`) | Cabeçalho de expiração automática: `customer_id`, `tenant_id`, `points_expired`. |
| `expiration_items` | `id` (`serial`) | **Ledger de expiração**: `expiration_id`, `transaction_id`, `points_deducted`. |

### Auditoria e Billing
| Tabela | PK | Campos-Chave e Regras |
| :--- | :--- | :--- |
| `audit_logs` | `id` (`serial`) | `tenant_id`, `operator_id`, `action` (`ADD_POINTS`, `REDEEM_REWARD`, `POINTS_EXPIRED`, `UPDATE_PASSWORD`, etc.), `entity_type`, `entity_id`, `metadata` (JSON text), `status` (`SUCESSO`/`FALHA`), `ip_address`. |
| `stripe_webhook_events` | `id` (`varchar`) | ID do evento Stripe (`evt_...`) e `processed_at` — garante idempotência de webhooks. |
| `stripe_invoices` | `id` (`varchar`) | Espelho local das faturas (`in_...`): `tenant_id`, `amount` (em centavos), `status`, `pdf_url`, `receipt_url`, `created_at`. |

---

## 3. Isolamento Multi-Tenant e Status do RLS

1. **Filtro explícito na aplicação (Ativo em todos os módulos)**:
   - Todas as queries de `dashboard`, `clientes`, `transacoes`, `recompensas`, `resgates`, `auditoria`, `usuarios` e `configuracoes` filtram explicitamente por `eq(tabela.tenantId, user.tenantId)`.
2. **Políticas RLS no Postgres (`backend/src/infra/database/rls.ts` e `drizzle/0006_*.sql`)**:
   - Existe o helper `withTenantTransaction`, que executa `set_config('request.jwt.claims', ...)` e `set_config('app.current_tenant', tenantId, true)`.
   - **⚠️ Ponto de Atenção (documentado nas auditorias)**: Em produção/dev atual, `DATABASE_URL` conecta com o usuário `postgres` (`rolbypassrls = true`), que ignora RLS por padrão no PostgreSQL, e os módulos chamam `db` diretamente em vez de `withTenantTransaction`. Portanto, a segurança multi-tenant hoje depende **100% dos filtros `WHERE tenant_id = ...` no código**. Veja [[05-Operacao/Dividas-Tecnicas-e-Auditorias]].

---

## 4. Supabase Storage (`storage-rls.sql` e `storage.gateway.ts`)

- O upload é feito pelo backend via `storageGateway.uploadFile(bucket, path, file, contentType)` usando `SUPABASE_SECRET_KEY` e `upsert: true`.
- **Buckets configurados**:
  - `tenant-logos`: Logos dos restaurantes.
  - `tenant-rewards`: Fotos das recompensas/prêmios.
- **Políticas de Storage (`storage.objects`)**:
  - `SELECT`: liberado para `public` (necessário para exibir imagens no app/landing e permitir `upsert`).
  - `INSERT`, `UPDATE`, `DELETE`: liberados para `authenticated`.
