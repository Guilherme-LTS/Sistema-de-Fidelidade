import { sql } from "drizzle-orm";
import { db } from "./infra/database/db.js";

async function main() {
  const rewards = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'rewards';
  `);
  console.log("REWARDS", rewards.rows);

  const redemptions = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'redemptions';
  `);
  console.log("REDEMPTIONS", redemptions.rows);

  process.exit(0);
}
main();
