import { db } from "./src/infra/database/db.js";
import { sql } from "drizzle-orm";

async function runMigration() {
  try {
    console.log("Starting architecture migration...");

    // 1. Add loyalty columns
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS loyalty_grace_period_days INTEGER DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS loyalty_expiration_days INTEGER DEFAULT 90;`);

    // 2. Migrate data from tenant_settings
    await db.execute(sql`
      UPDATE tenants t 
      SET loyalty_grace_period_days = COALESCE((SELECT setting_value FROM tenant_settings ts WHERE ts.tenant_id = t.id AND setting_key = 'carencia_pontos'), 0);
    `);
    
    await db.execute(sql`
      UPDATE tenants t 
      SET loyalty_expiration_days = COALESCE((SELECT setting_value FROM tenant_settings ts WHERE ts.tenant_id = t.id AND setting_key = 'expiracao_pontos'), 90);
    `);

    // 3. Drop tenant_settings table
    await db.execute(sql`DROP TABLE IF EXISTS tenant_settings;`);

    // 4. Drop redundant columns from customers
    await db.execute(sql`ALTER TABLE customers DROP COLUMN IF EXISTS document;`);
    await db.execute(sql`ALTER TABLE customers DROP COLUMN IF EXISTS name;`);
    await db.execute(sql`ALTER TABLE customers DROP COLUMN IF EXISTS lgpd_consent;`);
    await db.execute(sql`ALTER TABLE customers DROP COLUMN IF EXISTS consent_date;`);

    // 5. Update Unique Index on customers
    await db.execute(sql`DROP INDEX IF EXISTS idx_customers_tenant_document_unique;`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_consumer_unique ON customers (tenant_id, consumer_profile_id) WHERE deleted_at IS NULL;`);

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  }
  process.exit(0);
}

runMigration();
