-- ======================================================================================
-- FASE 1: SCHEMA EVOLUTION (DDL)
-- Objetivo: Padronizar o banco de dados para inglês (snake_case)
--           Adicionar colunas base (tenant_id, created_at, updated_at, deleted_at)
-- ======================================================================================

BEGIN;

-- 1. Criação das triggers universais para 'updated_at'
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ======================================================================================
-- 2. RENOMEAÇÕES E ADEQUAÇÕES: CLIENTES -> CUSTOMERS
-- ======================================================================================
ALTER TABLE IF EXISTS clientes RENAME TO customers;
ALTER INDEX IF EXISTS clientes_pkey RENAME TO customers_pkey;
ALTER TABLE customers RENAME COLUMN cpf TO document;
ALTER TABLE customers RENAME COLUMN nome TO name;
ALTER TABLE customers RENAME COLUMN pontos_totais TO total_points;
ALTER TABLE customers RENAME COLUMN data_criacao TO created_at;
ALTER TABLE customers RENAME COLUMN lgpd_consentimento TO lgpd_consent;
ALTER TABLE customers RENAME COLUMN data_consentimento TO consent_date;
-- Novas colunas Multi-tenant e Auditoria
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
-- Trigger
CREATE TRIGGER set_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ======================================================================================
-- 3. RENOMEAÇÕES E ADEQUAÇÕES: FUNCIONARIOS -> TENANT_USERS
-- ======================================================================================
ALTER TABLE IF EXISTS funcionarios RENAME TO tenant_users;
ALTER INDEX IF EXISTS funcionarios_pkey RENAME TO tenant_users_pkey;
ALTER TABLE tenant_users RENAME COLUMN nome TO name;
ALTER TABLE tenant_users RENAME COLUMN ativo TO is_active;
-- Novas colunas
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
CREATE TRIGGER set_tenant_users_updated_at BEFORE UPDATE ON tenant_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ======================================================================================
-- 4. RENOMEAÇÕES E ADEQUAÇÕES: RECOMPENSAS -> REWARDS
-- ======================================================================================
ALTER TABLE IF EXISTS recompensas RENAME TO rewards;
ALTER INDEX IF EXISTS recompensas_pkey RENAME TO rewards_pkey;
ALTER TABLE rewards RENAME COLUMN nome TO name;
ALTER TABLE rewards RENAME COLUMN descricao TO description;
ALTER TABLE rewards RENAME COLUMN custo_pontos TO points_cost;
ALTER TABLE rewards RENAME COLUMN ativo TO is_active;
-- Novas colunas
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
CREATE TRIGGER set_rewards_updated_at BEFORE UPDATE ON rewards FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ======================================================================================
-- 5. RENOMEAÇÕES E ADEQUAÇÕES: TRANSACOES -> TRANSACTIONS
-- ======================================================================================
ALTER TABLE IF EXISTS transacoes RENAME TO transactions;
ALTER INDEX IF EXISTS transacoes_pkey RENAME TO transactions_pkey;
ALTER TABLE transactions RENAME COLUMN cliente_id TO customer_id;
ALTER TABLE transactions RENAME COLUMN valor_gasto TO amount_spent;
ALTER TABLE transactions RENAME COLUMN pontos_ganhos TO points_earned;
ALTER TABLE transactions RENAME COLUMN data_transacao TO created_at;
ALTER TABLE transactions RENAME COLUMN data_liberacao TO available_at;
ALTER TABLE transactions RENAME COLUMN data_vencimento TO expires_at;
ALTER TABLE transactions RENAME COLUMN usuario_id TO operator_id;
ALTER TABLE transactions RENAME COLUMN pontos_restantes TO remaining_points;
-- Novas colunas
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
-- Obs: Sem deleted_at por ser uma transação financeira imutável
CREATE TRIGGER set_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ======================================================================================
-- 6. RENOMEAÇÕES E ADEQUAÇÕES: RESGATES -> REDEMPTIONS
-- ======================================================================================
ALTER TABLE IF EXISTS resgates RENAME TO redemptions;
ALTER INDEX IF EXISTS resgates_pkey RENAME TO redemptions_pkey;
ALTER TABLE redemptions RENAME COLUMN cliente_id TO customer_id;
ALTER TABLE redemptions RENAME COLUMN recompensa_id TO reward_id;
ALTER TABLE redemptions RENAME COLUMN pontos_gastos TO points_spent;
ALTER TABLE redemptions RENAME COLUMN data_resgate TO created_at;
ALTER TABLE redemptions RENAME COLUMN usuario_id TO operator_id;
-- Novas colunas
ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
-- Obs: Sem deleted_at por ser resgate imutável
CREATE TRIGGER set_redemptions_updated_at BEFORE UPDATE ON redemptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ======================================================================================
-- 7. RENOMEAÇÕES E ADEQUAÇÕES: CONFIGURACOES -> TENANT_SETTINGS
-- ======================================================================================
ALTER TABLE IF EXISTS configuracoes RENAME TO tenant_settings;
-- configuracoes não tinha pkey id, usava chave
ALTER TABLE tenant_settings RENAME COLUMN chave TO setting_key;
ALTER TABLE tenant_settings RENAME COLUMN valor TO setting_value;
ALTER TABLE tenant_settings RENAME COLUMN unidade TO setting_unit;
-- Novas colunas
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
CREATE TRIGGER set_tenant_settings_updated_at BEFORE UPDATE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ======================================================================================
-- 8. LIMPEZA DE LEGADOS (OPCIONAL, MAS RECOMENDADO PARA MANTER BANCO LIMPO)
-- ======================================================================================
-- Caso decida limpar as tabelas legadas do Auth antigo diretamente, remova os comentários abaixo:
-- DROP TABLE IF EXISTS usuarios CASCADE;
-- DROP TABLE IF EXISTS password_reset_tokens CASCADE;
-- DROP TABLE IF EXISTS refresh_tokens CASCADE;

COMMIT;