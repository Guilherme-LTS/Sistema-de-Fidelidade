
const fs = require('fs');
let code = fs.readFileSync('src/modules/clientes/clientes.routes.ts', 'utf8');

const oldExp = /const lotesExpiracaoResult = await db.query\([\\s\\S]*?const lotesExpiracao = lotesExpiracaoResult\.rows;/;
const oldPend = /const lotesPendentesResult = await db.query\([\\s\\S]*?const lotesPendentes = lotesPendentesResult\.rows;/;

const newQs = \const expiracaoUrgenteResult = await db.query(
      'SELECT COALESCE(SUM(pontos_restantes), 0) as pontos_expirando, MIN(data_vencimento) as data_proxima_expiracao FROM transacoes WHERE cliente_id =  AND data_liberacao <= NOW() AND data_vencimento > NOW() AND data_vencimento <= NOW() + INTERVAL \\'7 days\\' AND pontos_restantes > 0',
      [clienteId]
    );
    const pontosExpirando = parseInt(expiracaoUrgenteResult.rows[0].pontos_expirando, 10) || 0;
    const dataProximaExpiracao = expiracaoUrgenteResult.rows[0].data_proxima_expiracao;

    const liberacaoUrgenteResult = await db.query(
      'SELECT MIN(data_liberacao) as data_proxima_liberacao FROM transacoes WHERE cliente_id =  AND data_liberacao > NOW() AND pontos_restantes > 0',
      [clienteId]
    );
    const dataProximaLiberacao = liberacaoUrgenteResult.rows[0].data_proxima_liberacao;\;

code = code.replace(oldExp, newQs);
code = code.replace(oldPend, '');
code = code.replace('lotesExpiracao,\\n      lotesPendentes', 'pontosExpirando,\\n      dataProximaExpiracao,\\n      dataProximaLiberacao');
fs.writeFileSync('src/modules/clientes/clientes.routes.ts', code);
console.log('Done!');

