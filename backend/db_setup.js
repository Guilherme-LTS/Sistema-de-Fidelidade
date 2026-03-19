const db = require('./db');

async function exec() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        chave VARCHAR(50) PRIMARY KEY,
        valor INT,
        unidade VARCHAR(20)
      );
      INSERT INTO configuracoes (chave, valor, unidade) 
      VALUES ('expiracao_pontos', 6, 'meses') 
      ON CONFLICT (chave) DO NOTHING;
    `);
    console.log('Tabela configuracoes criada!');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

exec();