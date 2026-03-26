import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
});

async function migrate() {
  const client = await pool.connect();
  console.log('Iniciando migração FIFO...');
  
  try {
    await client.query('BEGIN');

    // 1. Adiciona coluna de controle de saldo unificado
    console.log('1. Adicionando coluna pontos_restantes em transacoes...');
    await client.query(`
      ALTER TABLE transacoes 
      ADD COLUMN IF NOT EXISTS pontos_restantes INTEGER NOT NULL DEFAULT 0;
    `);

    // 2. Inicializa o campo com os pontos originalmente ganhos
    console.log('2. Inicializando coluna pontos_restantes...');
    await client.query(`UPDATE transacoes SET pontos_restantes = pontos_ganhos;`);

    // 3. Processa consumo retroativo usando FIFO
    console.log('3. Consolidando resgates retroativos (FIFO)...');
    const clientesResult = await client.query('SELECT DISTINCT cliente_id FROM resgates');

    for (const { cliente_id } of clientesResult.rows) {
      // Pega todos os resgates ordenados pelo mais antigo
      const resgatesResult = await client.query(`
        SELECT id, pontos_gastos FROM resgates WHERE cliente_id = $1 ORDER BY data_resgate ASC
      `, [cliente_id]);

      // Pega os créditos depositados ordenados pelo mais antigo
      const transacoesResult = await client.query(`
        SELECT id, pontos_restantes FROM transacoes WHERE cliente_id = $1 ORDER BY data_transacao ASC
      `, [cliente_id]);

      let transacaoIdx = 0;
      let transacoes = transacoesResult.rows;

      // Executa a conciliação manual
      for (const resgate of resgatesResult.rows) {
        let restanteParaDescontar = resgate.pontos_gastos;

        while (restanteParaDescontar > 0 && transacaoIdx < transacoes.length) {
          const t = transacoes[transacaoIdx];
          
          if (t.pontos_restantes > 0) {
            const descontar = Math.min(t.pontos_restantes, restanteParaDescontar);
            t.pontos_restantes -= descontar;
            restanteParaDescontar -= descontar;
          }
          
          if (t.pontos_restantes === 0) {
            transacaoIdx++; // Avança pro próximo crédito se esse esvaziou
          }
        }
      }

      // Persiste os resultados deste cliente no banco
      for (const t of transacoes) {
        await client.query('UPDATE transacoes SET pontos_restantes = $1 WHERE id = $2', [t.pontos_restantes, t.id]);
      }
    }

    await client.query('COMMIT');
    console.log(' Migração e Conciliação FIFO concluídas com sucesso!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro na migração:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();