const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function createTable() {
  try {
    await client.connect();
    console.log('Conectado. Criando tabela funcionarios...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.funcionarios (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
        nome text NOT NULL,
        role text CHECK (role IN ('admin', 'operador')) DEFAULT 'operador',
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
      );
      
      ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Funcionarios autenticados podem buscar perfis" ON public.funcionarios;
      
      CREATE POLICY "Funcionarios autenticados podem buscar perfis"
        ON public.funcionarios FOR SELECT
        TO authenticated
        USING (true);
    `);
    console.log('Tabela criada com sucesso!');
  } catch (err) {
    console.error('Erro na criacao da tabela:', err);
  } finally {
    await client.end();
  }
}
createTable();
