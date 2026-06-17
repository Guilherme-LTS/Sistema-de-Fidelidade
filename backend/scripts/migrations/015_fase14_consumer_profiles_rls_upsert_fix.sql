-- ======================================================================================
-- FASE 14: AJUSTE DE RLS PARA UPSERT EM CONSUMER_PROFILES
-- Objetivo: permitir UPDATE em ON CONFLICT(document) durante upsert de perfil global,
--           mesmo quando ainda nao existe vinculo previo em customers para o tenant.
-- ======================================================================================

BEGIN;

DROP POLICY IF EXISTS "Tenant pode atualizar perfis vinculados" ON consumer_profiles;

CREATE POLICY "Tenant pode atualizar perfis vinculados" ON consumer_profiles
  FOR UPDATE
  USING (
    COALESCE((current_setting('request.jwt.claims', true)::json->>'tenant_id'), '') <> ''
  )
  WITH CHECK (
    COALESCE((current_setting('request.jwt.claims', true)::json->>'tenant_id'), '') <> ''
  );

COMMIT;
