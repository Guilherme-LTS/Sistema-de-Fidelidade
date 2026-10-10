ALTER TABLE "stripe_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stripe_webhook_events" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_stripe_invoices" ON "stripe_invoices";
CREATE POLICY "tenant_isolation_stripe_invoices" ON "stripe_invoices"
  FOR ALL
  TO public
  USING (
    ((tenant_id)::text = ((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))
    OR (tenant_id = (NULLIF(current_setting('app.current_tenant'::text, true), ''::text))::uuid)
  );

DROP POLICY IF EXISTS "tenant_isolation_stripe_invoices_authenticated" ON "stripe_invoices";
CREATE POLICY "tenant_isolation_stripe_invoices_authenticated" ON "stripe_invoices"
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );
