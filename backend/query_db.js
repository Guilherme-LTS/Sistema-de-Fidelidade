import pkg from 'pg';
const { Client } = pkg;

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.hzzujdjgyqnlhtrsfagz:guilherme27.fernando10@aws-1-sa-east-1.pooler.supabase.com:6543/postgres"
  });

  await client.connect();

  const res = await client.query("SELECT id, email, raw_user_meta_data FROM auth.users");
  console.log("ALL AUTH USERS:");
  console.log(res.rows);

  await client.end();
}

main().catch(console.error);
