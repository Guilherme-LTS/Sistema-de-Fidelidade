-- ======================================================================================
-- FASE 3: CONSISTÊNCIA MÁXIMA (CONSTRAINTS E INDEXES)
-- Objetivo: Garantir integridade B2B e escalar performance com índicies
-- ======================================================================================

BEGIN;

-- 1. Travar a coluna tenant_id para ser OBRIGATÓRIA (NOT NULL)
-- Como fizemos o backfill na Fase 2, todas as tabelas já têm o ID do restaurante
ALTER TABLE customers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tenant_users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rewards ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE redemptions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tenant_settings ALTER COLUMN tenant_id SET NOT NULL;

-- 2. Limpar constraints "Globais" antigas (ex: se CPF precisava ser único para o software todo)
-- OBS: Adapte os nomes abaixo se os seus constraints antigamente tinham nomes Customizados.
-- O padrão de nome gerado pelo Postgres costuma ser tabela_coluna_key
ALTER TABLE customers DROP CONSTRAINT IF EXISTS clientes_cpf_key;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_document_key;

-- 3. Nova Regra B2B: O consumidor pode ter o mesmo "document" em Restaurantes diferentes. 
-- Mas no mesmo restaurante (tenant_id) ele é ÚNICO.
ALTER TABLE customers ADD CONSTRAINT customers_tenant_document_unique UNIQUE (tenant_id, document);

-- 4. Criação de Índices Compostos (B-Tree) para alta performance (Evita Table Scans no banco)
-- Quando procurarem os clientes do seu restaurante por nome ou documento
CREATE INDEX IF NOT EXISTS idx_customers_tenant_search ON customers (tenant_id, name, document);

-- Quando gerenciarem permissões do auth e consultarem quem é o usuário
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_auth ON tenant_users (tenant_id, user_id);

-- Quando a Dashboard compilar quantas transações/resgates ocorreram neste mês
CREATE INDEX IF NOT EXISTS idx_trans_tenant_date ON transactions (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redeemp_tenant_date ON redemptions (tenant_id, created_at DESC);

-- Quando extraírem o extrato de um único cliente específico do seu restaurante 
CREATE INDEX IF NOT EXISTS idx_trans_tenant_cust ON transactions (tenant_id, customer_id);

COMMIT;