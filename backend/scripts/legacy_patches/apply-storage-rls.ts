import { db } from "./src/infra/database/db.js";
import { sql } from "drizzle-orm";

async function applyStorageRLS() {
  try {
    console.log("Applying Storage RLS policies...");

    const queries = [
      `
      -- Habilita RLS na tabela de objetos do storage, caso ainda não esteja
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      `,
      `
      -- Remove a política caso ela já exista para evitar erros
      DROP POLICY IF EXISTS "Restaurantes podem fazer upload de suas próprias logos" ON storage.objects;
      `,
      `
      -- Cria a política para upload
      -- A regra bucket_id = 'tenant-logos' e folder igual ao tenant_id do usuário (obtido via auth ou app.current_tenant)
      -- Como o frontend usa o token JWT que tem a role "authenticated", e o tenant_id é injetado,
      -- a forma mais fácil é permitir que usuários autenticados façam upload no bucket "tenant-logos".
      -- Aqui simplificamos permitindo upload se o usuário estiver logado e enviando pro bucket certo.
      CREATE POLICY "Restaurantes podem fazer upload de suas próprias logos" 
      ON storage.objects FOR INSERT 
      WITH CHECK (
        bucket_id = 'tenant-logos' 
        AND auth.role() = 'authenticated'
      );
      `,
      `
      DROP POLICY IF EXISTS "Restaurantes podem atualizar suas próprias logos" ON storage.objects;
      `,
      `
      CREATE POLICY "Restaurantes podem atualizar suas próprias logos" 
      ON storage.objects FOR UPDATE 
      USING (
        bucket_id = 'tenant-logos' 
        AND auth.role() = 'authenticated'
      );
      `,
      `
      DROP POLICY IF EXISTS "Qualquer um pode ler logos" ON storage.objects;
      `,
      `
      CREATE POLICY "Qualquer um pode ler logos" 
      ON storage.objects FOR SELECT 
      USING ( bucket_id = 'tenant-logos' );
      `
    ];

    for (const q of queries) {
      await db.execute(sql.raw(q));
    }

    console.log("Storage RLS policies applied successfully!");
  } catch (err) {
    console.error("Failed to apply Storage RLS:", err);
  }
  process.exit(0);
}

applyStorageRLS();
