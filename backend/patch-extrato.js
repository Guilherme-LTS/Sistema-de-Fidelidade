const fs = require('fs');
let code = fs.readFileSync('src/modules/clientes/clientes.routes.ts', 'utf8');

const regex = /const creditosQuery = [\s\S]*?res\.status\(200\)\.json\(extrato\);/;
const replacement = `const limit = parseInt(req.query.limit || '100', 10);
    const combinedQuery = \`
      SELECT * FROM (
        SELECT 'credito' as tipo, pontos_ganhos as pontos, data_transacao as data, 'Pontos por compra' as descricao 
        FROM transacoes WHERE cliente_id = $1
        UNION ALL
        SELECT 'debito' as tipo, res.pontos_gastos as pontos, res.data_resgate as data, rec.nome as descricao 
        FROM resgates res JOIN recompensas rec ON res.recompensa_id = rec.id WHERE res.cliente_id = $1
      ) as extrato_unificado
      ORDER BY data DESC
      LIMIT $2
    \`;
    const extratoResult = await db.query(combinedQuery, [clienteId, limit]);
    res.status(200).json(extratoResult.rows);`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/modules/clientes/clientes.routes.ts', code);
console.log('Extrato route patched com Union e Limit no DB.');
