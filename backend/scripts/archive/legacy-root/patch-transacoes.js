const fs = require('fs');
let code = fs.readFileSync('src/modules/transacoes/transacoes.routes.ts', 'utf8');

// Modifica verificação de role
code = code.replace(/if \(\(req as any\)\.usuario\.role !== 'admin'\) \{[\s\S]*?Acesso negado\. Apenas administradores[\s\S]*?\}/, `if ((req as any).usuario.role !== 'admin' && (req as any).usuario.role !== 'operador') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores ou operadores podem lançar pontos.' });
  }`);

// Modifica INSERT INTO clientes
code = code.replace(/INSERT INTO clientes \(cpf,\s*nome\)\s*VALUES\s*\(\$1,\s*\$2\)/, 'INSERT INTO clientes (cpf, nome, lgpd_consentimento) VALUES ($1, $2, false)');

fs.writeFileSync('src/modules/transacoes/transacoes.routes.ts', code);
console.log('transacoes atualizado.');