-- ======================================================================================
-- FASE 8: AUDIT LOGS
-- Objetivo: Registrar eventos de auditoria com usuario, detalhes e IP por tenant.
-- ======================================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES tenant_users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  details TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'SUCESSO',
  target_label VARCHAR(180),
  impact_label VARCHAR(120),
  ip_address INET,
  entity_type VARCHAR(80),
  entity_id VARCHAR(120),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created_at
  ON audit_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs (action);

COMMIT;
