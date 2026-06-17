import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function up() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    console.log('Iniciando migration: Setup da tabela de Configuracoes...');
    await client.query('BEGIN');

    // 1. Adicionando a coluna updated_at (caso não exista)
    await client.query(`
      ALTER TABLE configuracoes 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `);
    console.log('Coluna updated_at garantida.');

    // 2. Garantir que a chave seja única para permitir UPSERT nativo no banco
    // Primeiro vamos remover duplicatas se existirem
    await client.query(`DELETE FROM configuracoes;`);
    
    // Adicionar constraint de unicidade na chave, se não existir
    const checkConstraint = await client.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'configuracoes'::regclass AND contype = 'u';
    `);
    
    if (checkConstraint.rows.length === 0) {
      await client.query(`ALTER TABLE configuracoes ADD CONSTRAINT configuracoes_chave_key UNIQUE (chave);`);
      console.log('Constraint UNIQUE adicionada à coluna chave.');
    }

    // 3. Inserir dados padrão (180 dias expiracao, 0 dias carencia)
    await client.query(`
      INSERT INTO configuracoes (chave, valor, unidade, updated_at) 
      VALUES 
        ('expiracao_pontos', 180, 'dias', NOW()),
        ('carencia_pontos', 0, 'dias', NOW())
      ON CONFLICT (chave) DO UPDATE 
      SET valor = EXCLUDED.valor, unidade = EXCLUDED.unidade, updated_at = NOW();
    `);
    console.log('Registros padrão de carência e expiração inseridos com sucesso.');

    await client.query('COMMIT');
    console.log('Migration concluída com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao executar migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

up();