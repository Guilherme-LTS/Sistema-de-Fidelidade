-- ======================================================================================
-- FASE 12: RLS PARA CONSUMER_PROFILES
-- Objetivo: proteger a identidade global do consumidor, permitindo acesso apenas quando
--           houver vínculo com o tenant da sessão.
-- ======================================================================================

BEGIN;

ALTER TABLE consumer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant pode ler perfis vinculados" ON consumer_profiles;
CREATE POLICY "Tenant pode ler perfis vinculados" ON consumer_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM customers c
      WHERE c.consumer_profile_id = consumer_profiles.id
        AND c.tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id')
        AND c.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Tenant pode criar perfis" ON consumer_profiles;
CREATE POLICY "Tenant pode criar perfis" ON consumer_profiles
  FOR INSERT
  WITH CHECK (
    COALESCE(current_setting('request.jwt.claims', true)::json->>'tenant_id', '') <> ''
  );

DROP POLICY IF EXISTS "Tenant pode atualizar perfis vinculados" ON consumer_profiles;
CREATE POLICY "Tenant pode atualizar perfis vinculados" ON consumer_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM customers c
      WHERE c.consumer_profile_id = consumer_profiles.id
        AND c.tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id')
        AND c.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM customers c
      WHERE c.consumer_profile_id = consumer_profiles.id
        AND c.tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id')
        AND c.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Tenant pode excluir perfis vinculados" ON consumer_profiles;
CREATE POLICY "Tenant pode excluir perfis vinculados" ON consumer_profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM customers c
      WHERE c.consumer_profile_id = consumer_profiles.id
        AND c.tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id')
        AND c.deleted_at IS NULL
    )
  );

COMMIT;