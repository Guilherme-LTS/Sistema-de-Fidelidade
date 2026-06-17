-- ======================================================================================
-- FASE 10: USUARIOS INTERNOS SEM AUTH
-- Objetivo: armazenar usuarios operacionais do tenant sem criar conta em auth.users.
-- ======================================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS tenant_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT CHECK (role IN ('admin', 'operador')) DEFAULT 'operador',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_tenant_staff_tenant_role
  ON tenant_staff(tenant_id, role);

CREATE INDEX IF NOT EXISTS idx_tenant_staff_tenant_active
  ON tenant_staff(tenant_id, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_staff_tenant_email_unique
  ON tenant_staff(tenant_id, email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_tenant_staff_updated_at ON tenant_staff;
CREATE TRIGGER set_tenant_staff_updated_at
  BEFORE UPDATE ON tenant_staff
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE tenant_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin de Tenant le equipe sem auth" ON tenant_staff;
CREATE POLICY "Admin de Tenant le equipe sem auth" ON tenant_staff FOR ALL
  USING (tenant_id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));

COMMIT;
