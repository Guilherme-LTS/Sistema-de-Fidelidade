-- ======================================================================================
-- FASE 13: AUDIT LOGS RLS HARDENING
-- Objetivo: garantir isolamento multi-tenant completo em audit_logs.
-- ======================================================================================

BEGIN;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit logs tenant select" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs tenant insert" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs tenant update" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs tenant delete" ON audit_logs;

CREATE POLICY "Audit logs tenant select" ON audit_logs
  FOR SELECT
  USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

CREATE POLICY "Audit logs tenant insert" ON audit_logs
  FOR INSERT
  WITH CHECK (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

CREATE POLICY "Audit logs tenant update" ON audit_logs
  FOR UPDATE
  USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id'))
  WITH CHECK (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

CREATE POLICY "Audit logs tenant delete" ON audit_logs
  FOR DELETE
  USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

COMMIT;
