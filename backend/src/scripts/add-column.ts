import { db } from "../infra/database/db.js";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Adicionando coluna cancel_at_period_end...");
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false NOT NULL;`);
    console.log("Coluna adicionada com sucesso.");
    process.exit(0);
  } catch (error) {
    console.error("Erro:", error);
    process.exit(1);
  }
}

main();
