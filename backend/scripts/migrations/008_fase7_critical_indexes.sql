-- Migration 008: Fase 7 - Critical Indexes for Scalability
-- Purpose: Add composite indexes on tenant_id + business columns to prevent table scans
-- Estimated Impact: 10-100x faster queries on payloads with 1000+ records per tenant

BEGIN;

-- 1. Rewards: Multi-tenant reward listing with active filter
-- Covers: GET /recompensas (line 11), GET /recompensas/publica (line 23), POST /redemptions (line 30)
CREATE INDEX IF NOT EXISTS idx_rewards_tenant_active 
  ON rewards(tenant_id, is_active, points_cost);

-- 2. Transactions: Expiration validation (prevents table scan on every point check)
-- Covers: GET /clientes/:document (line 76 - expires_at > NOW())
--         GET /public/pontos/:document (similar)
--         POST /resgates (line 41 - expires_at > NOW() and available_at <= NOW())
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_expires 
  ON transactions(tenant_id, expires_at DESC);

-- 3. Transactions: Availability check (prevents table scan on grace period logic)
-- Covers: GET /clientes/:document (line 81 - available_at > NOW() for pending points)
--         POST /resgates (line 41 - available_at <= NOW() for available points)
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_available 
  ON transactions(tenant_id, available_at ASC);

-- 4. Redemptions: Reward lookup (Foreign key without index = O(N) JOIN)
-- Covers: GET /clientes/:document/extrato (line 150 JOIN rewards)
--         POST /resgates (line 30 - SELECT FROM rewards WHERE id = $1)
CREATE INDEX IF NOT EXISTS idx_redemptions_reward_tenant
  ON redemptions(reward_id, tenant_id);

-- 5. Customers: Document lookup (Exact match, frequently used)
-- Covers: POST /cadastro (line 177), POST /transacoes (line 61), POST /resgates (line 25)
-- NOTE: May already exist as unique index, but including for safety
CREATE INDEX IF NOT EXISTS idx_customers_document_tenant
  ON customers(document, tenant_id)
  WHERE deleted_at IS NULL;

-- 6. Transactions: Customer lookup (Most frequent query pattern)
-- Covers: All transaction queries grouped by customer_id
CREATE INDEX IF NOT EXISTS idx_transactions_customer_tenant
  ON transactions(customer_id, tenant_id);

-- 7. Tenant Users: Role-based queries (Admin listing, user management)
-- Covers: PUT /admin/usuarios/:id (line 153), DELETE /admin/usuarios/:id (line 238)
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_role
  ON tenant_users(tenant_id, role);

COMMIT;

-- Verify indexes were created
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('rewards', 'transactions', 'redemptions', 'customers', 'tenant_users') ORDER BY tablename, indexname;
