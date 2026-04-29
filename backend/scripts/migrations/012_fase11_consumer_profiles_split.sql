-- ======================================================================================
-- FASE 11: SPLIT ENTRE IDENTIDADE GLOBAL E VINCULO POR TENANT
-- Objetivo: manter a pessoa em uma tabela global e o relacionamento com o restaurante
--           na tabela customers, sem quebrar o modelo atual.
-- ======================================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS consumer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document VARCHAR(11) NOT NULL UNIQUE,
  name VARCHAR,
  lgpd_consent BOOLEAN NOT NULL DEFAULT FALSE,
  consent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER set_consumer_profiles_updated_at
BEFORE UPDATE ON consumer_profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS consumer_profile_id UUID;

INSERT INTO consumer_profiles (document, name, lgpd_consent, consent_date, created_at, updated_at, deleted_at)
SELECT DISTINCT ON (c.document)
  c.document,
  NULLIF(TRIM(c.name), ''),
  COALESCE(c.lgpd_consent, FALSE),
  c.consent_date,
  COALESCE(c.created_at, NOW()),
  COALESCE(c.updated_at, c.created_at, NOW()),
  c.deleted_at
FROM customers c
WHERE c.document IS NOT NULL
  AND c.document <> ''
ORDER BY c.document, c.updated_at DESC NULLS LAST, c.created_at DESC NULLS LAST, c.id DESC
ON CONFLICT (document) DO NOTHING;

UPDATE customers c
SET consumer_profile_id = cp.id
FROM consumer_profiles cp
WHERE cp.document = c.document
  AND c.consumer_profile_id IS NULL;

ALTER TABLE customers
  ALTER COLUMN consumer_profile_id SET NOT NULL;

ALTER TABLE customers
  ADD CONSTRAINT customers_consumer_profile_unique UNIQUE (tenant_id, consumer_profile_id);

ALTER TABLE customers
  ADD CONSTRAINT customers_consumer_profile_fk
  FOREIGN KEY (consumer_profile_id) REFERENCES consumer_profiles(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_consumer_profiles_document
  ON consumer_profiles (document);

CREATE INDEX IF NOT EXISTS idx_customers_consumer_profile_id
  ON customers (consumer_profile_id);

COMMIT;