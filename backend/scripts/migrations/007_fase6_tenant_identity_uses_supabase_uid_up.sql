-- ======================================================================================
-- FASE 6 (UP): TENANT_ID = SUPABASE AUTH UID
-- Objetivo: Usar o UID real do Supabase Auth como identificador canônico do tenant.
--           O tenant_id de todas as tabelas passa a apontar para o auth.users.id do dono.
-- ======================================================================================

BEGIN;

CREATE TEMP TABLE tenant_identity_map ON COMMIT DROP AS
SELECT DISTINCT
  t.id AS old_tenant_id,
  tu.user_id AS new_tenant_id
FROM tenants t
JOIN tenant_users tu ON tu.tenant_id = t.id
WHERE tu.role = 'admin';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenant_identity_map) THEN
    RAISE EXCEPTION 'Migração abortada: nenhum admin encontrado para mapear o tenant.';
  END IF;

  IF EXISTS (
    SELECT new_tenant_id
    FROM tenant_identity_map
    GROUP BY new_tenant_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migração abortada: um mesmo auth user está sendo usado como admin de múltiplos tenants.';
  END IF;
END $$;

UPDATE tenant_users tu
SET tenant_id = tm.new_tenant_id
FROM tenant_identity_map tm
WHERE tu.tenant_id = tm.old_tenant_id;

UPDATE customers c
SET tenant_id = tm.new_tenant_id
FROM tenant_identity_map tm
WHERE c.tenant_id = tm.old_tenant_id;

UPDATE transactions tr
SET tenant_id = tm.new_tenant_id
FROM tenant_identity_map tm
WHERE tr.tenant_id = tm.old_tenant_id;

UPDATE rewards r
SET tenant_id = tm.new_tenant_id
FROM tenant_identity_map tm
WHERE r.tenant_id = tm.old_tenant_id;

UPDATE redemptions r
SET tenant_id = tm.new_tenant_id
FROM tenant_identity_map tm
WHERE r.tenant_id = tm.old_tenant_id;

UPDATE tenant_settings ts
SET tenant_id = tm.new_tenant_id
FROM tenant_identity_map tm
WHERE ts.tenant_id = tm.old_tenant_id;

UPDATE tenants t
SET id = tm.new_tenant_id
FROM tenant_identity_map tm
WHERE t.id = tm.old_tenant_id;

ALTER TABLE tenants
  ALTER COLUMN id DROP DEFAULT;

WITH tenant_map AS (
  SELECT DISTINCT
    t.id AS tenant_id
  FROM tenants t
)
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_unit, updated_at)
SELECT
  tm.tenant_id,
  defaults.setting_key,
  defaults.setting_value,
  defaults.setting_unit,
  NOW()
FROM tenant_map tm
CROSS JOIN (
  VALUES
    ('carencia_pontos', 0, 'dias'),
    ('expiracao_pontos', 180, 'dias')
) AS defaults(setting_key, setting_value, setting_unit)
ON CONFLICT (tenant_id, setting_key)
DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  setting_unit = EXCLUDED.setting_unit,
  updated_at = NOW();

COMMIT;