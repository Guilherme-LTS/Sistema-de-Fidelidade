-- Adiciona a coluna logo_url se ela não existir
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Adiciona a política de UPDATE para que os tenants possam atualizar seu próprio perfil
DROP POLICY IF EXISTS "Atualizacao do proprio Tenant" ON tenants;

CREATE POLICY "Atualizacao do proprio Tenant" ON tenants FOR UPDATE
  USING (id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id'))
  WITH CHECK (id::text = (current_setting('request.jwt.claims', true)::json->>'tenant_id'));
