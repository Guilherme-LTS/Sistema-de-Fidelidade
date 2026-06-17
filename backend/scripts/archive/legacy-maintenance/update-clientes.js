const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/modules/clientes/clientes.routes.ts');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /const creditosResult = await db\.query\([\s\S]*?const pontosPendentes = parseInt\(pontosPendentesResult\.rows\[0\]\.total\);/m;

const newCode = `const creditosResult = await db.query(
      \`SELECT COALESCE(SUM(pontos_restantes), 0) as total FROM transacoes WHERE cliente_id = $1 AND data_liberacao <= NOW() AND data_vencimento > NOW()\`,
      [clienteId]
    );
    const pontosDisponiveis = parseInt(creditosResult.rows[0].total);

    const pontosPendentesResult = await db.query(
      \`SELECT COALESCE(SUM(pontos_restantes), 0) as total FROM transacoes WHERE cliente_id = $1 AND data_liberacao > NOW()\`,
      [clienteId]
    );
    const pontosPendentes = parseInt(pontosPendentesResult.rows[0].total);`;

if (regex.test(content)) {
    content = content.replace(regex, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Done replacing clientes.routes.ts');
} else {
    console.log("Failed to match content regex for clientes!");
}
