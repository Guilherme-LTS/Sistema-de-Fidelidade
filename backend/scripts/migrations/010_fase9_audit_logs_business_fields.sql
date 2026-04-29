-- ======================================================================================
-- FASE 9: AUDIT LOGS BUSINESS FIELDS
-- Objetivo: Enriquecer audit_logs para UX orientada a negócio.
-- ======================================================================================

BEGIN;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'SUCESSO',
  ADD COLUMN IF NOT EXISTS target_label VARCHAR(180),
  ADD COLUMN IF NOT EXISTS impact_label VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_audit_logs_status
  ON audit_logs (status);

COMMIT;
