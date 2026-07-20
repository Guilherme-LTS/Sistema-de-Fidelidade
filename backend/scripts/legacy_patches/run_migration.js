import pkg from 'pg';
const { Client } = pkg;

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.hzzujdjgyqnlhtrsfagz:guilherme27.fernando10@aws-1-sa-east-1.pooler.supabase.com:6543/postgres"
  });

  await client.connect();

  const query = `
    -- Adicionar colunas
    ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
    ALTER TABLE public.consumer_profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;

    -- Atualizar a Trigger
    CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
    RETURNS trigger AS $$
    DECLARE
      v_tenant_id uuid;
      v_slug text;
      v_base_slug text;
      v_counter integer := 1;
    BEGIN
      -- FLUXO B2B (CADASTRO DE RESTAURANTE)
      IF NEW.raw_user_meta_data->>'tenantName' IS NOT NULL THEN
        -- Gerar Slug Base
        v_base_slug := lower(trim(both '-' from regexp_replace(NEW.raw_user_meta_data->>'tenantName', '[^a-zA-Z0-9]+', '-', 'g')));
        v_slug := v_base_slug;

        -- Loop para garantir unicidade do slug
        WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) LOOP
          v_slug := v_base_slug || '-' || v_counter;
          v_counter := v_counter + 1;
        END LOOP;

        -- Insere Tenant
        INSERT INTO public.tenants (id, name, slug, document, phone, email)
        VALUES (
          NEW.id, 
          NEW.raw_user_meta_data->>'tenantName', 
          v_slug,
          NEW.raw_user_meta_data->>'document', 
          NEW.raw_user_meta_data->>'phone', 
          NEW.email
        )
        RETURNING id INTO v_tenant_id;

        -- Insere Admin
        INSERT INTO public.tenant_users (tenant_id, user_id, name, phone, role)
        VALUES (
          v_tenant_id, 
          NEW.id, 
          NEW.raw_user_meta_data->>'adminName', 
          NEW.raw_user_meta_data->>'phone', 
          'admin'
        );

      -- FLUXO CONSUMIDOR FINAL (PORTAL /fidelidade)
      ELSIF NEW.raw_user_meta_data->>'isConsumer' = 'true' THEN
        -- Se o consumidor informou CPF (document), vamos linkar
        IF NEW.raw_user_meta_data->>'document' IS NOT NULL THEN
          -- Verifica se ja existe consumer_profiles com esse CPF
          IF EXISTS (SELECT 1 FROM public.consumer_profiles WHERE document = NEW.raw_user_meta_data->>'document') THEN
            UPDATE public.consumer_profiles
            SET auth_user_id = NEW.id,
                name = COALESCE(name, NEW.raw_user_meta_data->>'name')
            WHERE document = NEW.raw_user_meta_data->>'document';
          ELSE
            -- Cria novo perfil órfão caso não exista ainda
            INSERT INTO public.consumer_profiles (auth_user_id, document, name)
            VALUES (
              NEW.id,
              NEW.raw_user_meta_data->>'document',
              NEW.raw_user_meta_data->>'name'
            );
          END IF;
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Recria a trigger substituindo a antiga
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();
  `;

  try {
    await client.query(query);
    console.log("Migration executed successfully.");
  } catch (error) {
    console.error("Error executing migration:", error);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
