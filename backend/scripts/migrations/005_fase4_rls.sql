-- ======================================================================================
-- FASE 4: ROW LEVEL SECURITY (RLS) E CUSTOM PAYLOADS SUPABASE AUTH
-- Objetivo: Blindar o banco de dados contra vazamentos trans-tenants.
-- Cada linha só será visível/mutável se 'request.jwt.claims' contiver aquele 'tenant_id'.
-- ======================================================================================

BEGIN;

-- 1. Habilitando as comportas do RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS CRÍTICAS DE B2B:
-- Como usamos o nosso "queryWithRLS", injetaremos "tenant_id" no metadado do JWT
-- Essas funções leem dentro do token do usuário a variável que preenchemos via Node / Supabase.

-- Se o campo 'tenant_id' no JWT do request não bater perfeitamente com a coluna da máquina, a tela fica amnésica.

-- Tenants: O usuário logado só enxerga do próprio restaurante.
CREATE POLICY "Leitura do proprio Tenant" ON tenants FOR SELECT
  USING (id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

-- Users: A autoridade Master de "admin" do restaurante que quer ver sua equipe.
CREATE POLICY "Admin de Tenant le equipe" ON tenant_users FOR ALL
  USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

-- Clientes do Restaurante: Somente quem for do restaurante
CREATE POLICY "Privacidade B2B de Clientes" ON customers FOR ALL
  USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

-- Transações: Não tem meio termo, se não for funcionário local ou logado pra ele: NULO.
CREATE POLICY "Blindagem Financeira Ledger" ON transactions FOR ALL
  USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

-- Resgates Financeiros: O mesmo teto de vidro de isolamento das transações.
CREATE POLICY "Isolamento Resgates Ledger" ON redemptions FOR ALL
  USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

-- Recompensas Personalizadas (Restaurante X não vê Hotdog do Y)
CREATE POLICY "Privacidade do Menu Recompensas" ON rewards FOR ALL
  USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

-- Permissões personalizadas
CREATE POLICY "Admin Settings B2B" ON tenant_settings FOR ALL
  USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

COMMIT;