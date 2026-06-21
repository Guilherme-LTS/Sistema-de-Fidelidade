import { createClient } from "@supabase/supabase-js";
import { env } from "./src/config/env.js";

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStoragePolicies() {
  console.log("Checking storage policies...");
  
  // Actually, we can't easily query pg_policies via supabase-js unless we use rpc or raw sql.
  // We can use drizzle to query pg_policies.
  const { db } = await import("./src/infra/database/db.js");
  const { sql } = await import("drizzle-orm");

  const result = await db.execute(sql`
    SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects';
  `);
  
  console.log("Current policies on storage.objects:");
  console.log(result.rows);
  process.exit(0);
}

checkStoragePolicies();
