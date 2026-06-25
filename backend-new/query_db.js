import pkg from 'pg';
const { Client } = pkg;

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.hzzujdjgyqnlhtrsfagz:guilherme27.fernando10@aws-1-sa-east-1.pooler.supabase.com:6543/postgres"
  });

  await client.connect();
  const res1 = await client.query('SELECT * FROM public.tenants ORDER BY created_at DESC LIMIT 3');
  console.log("TENANTS:", res1.rows);
  
  const res2 = await client.query('SELECT * FROM public.tenant_users ORDER BY created_at DESC LIMIT 3');
  console.log("TENANT_USERS:", res2.rows);

  await client.end();
}

main().catch(console.error);
