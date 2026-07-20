import pkg from 'pg';
const { Client } = pkg;

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.hzzujdjgyqnlhtrsfagz:guilherme27.fernando10@aws-1-sa-east-1.pooler.supabase.com:6543/postgres"
  });

  await client.connect();

  const query = `
    CREATE OR REPLACE FUNCTION public.handle_new_tenant()
    RETURNS trigger AS $$
    DECLARE
      v_tenant_id uuid;
      v_tenant_name text;
      v_admin_name text;
      v_document text;
      v_phone text;
    BEGIN
      -- Read from raw_user_meta_data
      v_tenant_name := NEW.raw_user_meta_data->>'tenantName';
      v_admin_name := NEW.raw_user_meta_data->>'adminName';
      v_document := NEW.raw_user_meta_data->>'document';
      v_phone := NEW.raw_user_meta_data->>'phone';

      -- Only execute if the signup is intended for a new tenant
      IF v_tenant_name IS NOT NULL THEN
        -- Insert into tenants
        INSERT INTO public.tenants (id, name, document, phone, email)
        VALUES (
          NEW.id, 
          v_tenant_name, 
          v_document, 
          v_phone, 
          NEW.email
        )
        RETURNING id INTO v_tenant_id;

        -- Insert into tenant_users
        INSERT INTO public.tenant_users (tenant_id, user_id, name, phone, role)
        VALUES (
          v_tenant_id, 
          NEW.id, 
          v_admin_name, 
          v_phone, 
          'admin'
        );
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_tenant();
  `;

  try {
    await client.query(query);
    console.log("Trigger created successfully.");
  } catch (error) {
    console.error("Error executing query:", error);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
