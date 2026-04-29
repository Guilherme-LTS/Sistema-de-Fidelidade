-- ======================================================================================
-- FASE 5 (DOWN): REVERTER TENANT_SETTINGS PARA CHAVE GLOBAL
-- Objetivo: Restaurar chave global em setting_key com guarda para evitar duplicidade
-- ======================================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT setting_key
    FROM tenant_settings
    GROUP BY setting_key
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Rollback bloqueado: existem setting_key duplicadas entre tenants.';
  END IF;
END $$;

ALTER TABLE tenant_settings
  DROP CONSTRAINT IF EXISTS tenant_settings_pkey;

ALTER TABLE tenant_settings
  ADD CONSTRAINT configuracoes_pkey PRIMARY KEY (setting_key);

ALTER TABLE tenant_settings
  ADD CONSTRAINT configuracoes_chave_key UNIQUE (setting_key);

COMMIT;
