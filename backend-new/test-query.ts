import { db } from "./src/infra/database/db.js";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const profileId = "e633bb13-01f5-4253-bfa9-fab6d43ce462";
    const nowAt = new Date().toISOString();

    console.log("Running query with profileId:", profileId, "and nowAt:", nowAt);

    const { rows } = await db.execute(sql`
      WITH app_clock AS (SELECT ${nowAt}::timestamptz AS now_at)
      SELECT 
        t.id AS tenant_id,
        t.name AS tenant_name,
        t.slug AS tenant_slug,
        t.logo_url AS tenant_logo,
        c.id AS customer_id,
        COALESCE(SUM(CASE
          WHEN tr.available_at <= (SELECT now_at FROM app_clock) AND tr.expires_at > (SELECT now_at FROM app_clock)
          THEN tr.remaining_points
          ELSE 0
        END), 0)::int AS pontos_disponiveis,
        COALESCE(SUM(CASE
          WHEN tr.available_at > (SELECT now_at FROM app_clock)
          THEN tr.remaining_points
          ELSE 0
        END), 0)::int AS pontos_pendentes,
        COALESCE(SUM(CASE
          WHEN tr.available_at <= (SELECT now_at FROM app_clock) 
               AND tr.expires_at > (SELECT now_at FROM app_clock) 
               AND tr.expires_at <= (SELECT now_at FROM app_clock) + INTERVAL '30 days'
          THEN tr.remaining_points
          ELSE 0
        END), 0)::int AS pontos_expirando
      FROM customers c
      INNER JOIN tenants t ON c.tenant_id = t.id
      LEFT JOIN transactions tr ON tr.customer_id = c.id
      WHERE c.consumer_profile_id = ${profileId}
        AND c.deleted_at IS NULL
        AND t.is_active = true
      GROUP BY t.id, t.name, t.slug, t.logo_url, c.id
    `);

    console.log("Query success! Result rows:");
    console.log(rows);
  } catch (error) {
    console.error("DB Error:", error);
  }
  process.exit(0);
}

run();
