-- ======================================================================================
-- FASE 5 (UP): TENANT_SETTINGS POR TENANT
-- Objetivo: Remover unicidade global de setting_key e garantir chave por (tenant_id, setting_key)
-- ======================================================================================

BEGIN;

ALTER TABLE tenant_settings
  DROP CONSTRAINT IF EXISTS configuracoes_chave_key;

ALTER TABLE tenant_settings
  DROP CONSTRAINT IF EXISTS configuracoes_pkey;

ALTER TABLE tenant_settings
  ADD CONSTRAINT tenant_settings_pkey PRIMARY KEY (tenant_id, setting_key);

COMMIT;
