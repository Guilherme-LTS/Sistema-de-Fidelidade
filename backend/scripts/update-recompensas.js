const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/modules/recompensas/recompensas.routes.ts');
let content = fs.readFileSync(filePath, 'utf8');

const newCode = `    // 1. Busca transações válidas via FIFO
    const transacoesValidas = await client.query(
      \`SELECT id, pontos_restantes FROM transacoes 
       WHERE cliente_id = $1 AND pontos_restantes > 0 
       AND data_liberacao <= NOW() AND data_vencimento > NOW()
       ORDER BY data_vencimento ASC, data_transacao ASC\`,
      [cliente.id]
    );

    const pontosDisponiveis = transacoesValidas.rows.reduce((acc, t) => acc + t.pontos_restantes, 0);

    if (pontosDisponiveis < recompensa.custo_pontos) {
      throw new Error('Pontos dispon\u00EDveis insuficientes.');
    }

    // 2. Aplica débito abatendo FIFO das transações
    let pontosNecessarios = recompensa.custo_pontos;
    for (const t of transacoesValidas.rows) {
      if (pontosNecessarios <= 0) break;
      
      const descontar = Math.min(t.pontos_restantes, pontosNecessarios);
      pontosNecessarios -= descontar;
      
      await client.query(
        'UPDATE transacoes SET pontos_restantes = pontos_restantes - $1 WHERE id = $2',
        [descontar, t.id]
      );
    }

    // 3. Registra histórico do resgate
    await client.query(
      'INSERT INTO resgates (cliente_id, recompensa_id, pontos_gastos, usuario_id) VALUES ($1, $2, $3, $4)',
      [cliente.id, recompensa_id, recompensa.custo_pontos, operadorId]
    );`;

const regex = /const creditosResult[\s\S]*?\[cliente\.id, recompensa_id, recompensa\.custo_pontos, operadorId\]\n    \);/;

if (regex.test(content)) {
    content = content.replace(regex, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Done replacing recompensas.routes.ts');
} else {
    console.log("Failed to match content regex!");
}