-- ======================================================================================
-- FASE 2: BACKFILL DO TENANT PIONEIRO
-- Objetivo: Criar a tabela central de tenants (empresas) B2B e migrar os dados atuais
-- ======================================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    document VARCHAR,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER set_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Cria um Tenant "Padrão/Semente" usando um UUID fixo conhecido 
-- TODO: Você poderá vir aqui alterar o "Restaurante Origem" pelo nome do seu restaurante atual
INSERT INTO tenants (id, name, document) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Restaurante Semente (Pioneiro)', '00000000000000') 
ON CONFLICT DO NOTHING;

-- Associa absolutamente todos os dados antigos ao Restaurante Semente
UPDATE customers SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE tenant_users SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE rewards SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE transactions SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE redemptions SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE tenant_settings SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

COMMIT;