const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/modules/admin/admin.routes.ts');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /\(SELECT COALESCE\(SUM\(t\.pontos_ganhos\), 0\) FROM transacoes t WHERE t\.cliente_id = c\.id AND t\.data_liberacao <= NOW\(\) AND t\.data_vencimento > NOW\(\)\) -            \(SELECT COALESCE\(SUM\(r\.pontos_gastos\), 0\) FROM resgates r WHERE r\.cliente_id = c\.id\) as pontos_disponiveis/;

const newCode = `(SELECT COALESCE(SUM(t.pontos_restantes), 0) FROM transacoes t WHERE t.cliente_id = c.id AND t.data_liberacao <= NOW() AND t.data_vencimento > NOW()) as pontos_disponiveis`;

if (regex.test(content)) {
    content = content.replace(regex, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Done replacing admin.routes.ts');
} else {
    // try looser matched spacing
    const regex2 = /\(SELECT COALESCE\(SUM\(t\.pontos_ganhos\), 0\) FROM transacoes t WHERE t\.cliente_id = c\.id AND t\.data_liberacao <= NOW\(\) AND t\.data_vencimento > NOW\(\)\)[\s\S]+?\(SELECT COALESCE\(SUM\(r\.pontos_gastos\), 0\) FROM resgates r WHERE r\.cliente_id = c\.id\) as pontos_disponiveis/;
    if (regex2.test(content)) {
        content = content.replace(regex2, newCode);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Done replacing admin.routes.ts via regex2');
    } else {
        console.log("Failed to match content regex for admin!");
    }
}
