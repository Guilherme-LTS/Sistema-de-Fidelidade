const fs = require('fs');
let code = fs.readFileSync('src/modules/admin/admin.routes.ts', 'utf8');

const novo = `// GET /admin/auditoria - Log de auditoria (apenas admin)
router.get('/auditoria', verificaToken, async (req: Request, res: Response) => {
  if ((req as any).usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }

  const { page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    const countQuery = \`
      SELECT SUM(total) as count FROM (
        SELECT COUNT(*) as total FROM transacoes
        UNION ALL
        SELECT COUNT(*) as total FROM resgates
      ) as combined_counts;
    \`;
    const countResult = await db.query(countQuery);
    const totalItens = parseInt(countResult.rows[0].count || '0', 10);

    const query = \`
      SELECT t.id, t.data_transacao as data, 'Lançamento de Pontos' as acao, c.nome as nome_cliente, u.nome as nome_operador, t.pontos_ganhos as pontos
      FROM transacoes t
      JOIN clientes c ON t.cliente_id = c.id
      JOIN usuarios u ON t.usuario_id = u.id
      UNION ALL
      SELECT r.id, r.data_resgate as data, rec.nome as acao, c.nome as nome_cliente, u.nome as nome_operador, r.pontos_gastos * -1 as pontos
      FROM resgates r
      JOIN clientes c ON r.cliente_id = c.id
      JOIN usuarios u ON r.usuario_id = u.id
      JOIN recompensas rec ON r.recompensa_id = rec.id
      ORDER BY data DESC
      LIMIT $1 OFFSET $2;
    \`;

    const result = await db.query(query, [Number(limit), offset]);
    res.status(200).json({
      data: result.rows,
      pagination: {
        total: totalItens,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalItens / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

export default router;`;

const idx = code.indexOf('// GET /admin/auditoria');
if (idx > -1) {
  code = code.substring(0, idx) + novo;
  fs.writeFileSync('src/modules/admin/admin.routes.ts', code);
  console.log('Feito!');
} else {
  console.log('Nao copiou');
}
