const fs = require('fs');

const adminContent = `import { Router, Request, Response } from 'express';
import db from '../../infra/database/db';
import verificaToken from '../../shared/middlewares/autenticacao';
import { supabaseAdmin } from '../../shared/supabase';

const router = Router();

// GET /auditoria - Log de auditoria (apenas admin)
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
      SELECT t.id, t.data_transacao as data, 'Lancamento de Pontos' as acao, c.nome as nome_cliente, u.nome as nome_operador, t.pontos_ganhos as pontos
      FROM transacoes t
      LEFT JOIN clientes c ON t.cliente_id = c.id
      LEFT JOIN funcionarios u ON t.usuario_id = u.id
      UNION ALL
      SELECT r.id, r.data_resgate as data, rec.nome as acao, c.nome as nome_cliente, u.nome as nome_operador, r.pontos_gastos * -1 as pontos
      FROM resgates r
      LEFT JOIN clientes c ON r.cliente_id = c.id
      LEFT JOIN funcionarios u ON r.usuario_id = u.id
      LEFT JOIN recompensas rec ON r.recompensa_id = rec.id
      ORDER BY data DESC
      LIMIT \$1 OFFSET \$2;
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

// POST /usuarios - Criacao controlada de funcionarios
router.post('/usuarios', verificaToken, async (req: Request, res: Response) => {
  if ((req as any).usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }

  const { email, password, nome, role = 'operador' } = req.body;

  if (!email || !password || !nome) {
    return res.status(400).json({ error: 'Email, senha e nome sao obrigatorios.' });
  }

  if (role !== 'admin' && role !== 'operador') {
    return res.status(400).json({ error: 'Role invalida.' });
  }

  const client = await db.connect();
  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome }
    });

    if (authError || !authData.user) {
      console.error('Erro no Supabase Auth:', authError);
      return res.status(400).json({ error: authError?.message || 'Erro ao criar usuario no Supabase Auth.' });
    }

    const userId = authData.user.id;

    await client.query(
      'INSERT INTO funcionarios (user_id, nome, role) VALUES ($1, $2, $3)',     
      [userId, nome, role]
    );

    res.status(201).json({
      message: 'Usuario interno criado com sucesso.',
      usuario: { id: userId, email, nome, role }
    });
  } catch (error: any) {
    console.error('Erro na criacao de funcionario:', error);
    if (error.code === '23505') {
       return res.status(409).json({ error: 'Usuario ja existe na base de funcionarios.' });
    }
    res.status(500).json({ error: 'Erro interno do servidor ao criar usuario.' });
  } finally {
    client.release();
  }
});

export default router;
`;

fs.writeFileSync('C:\\Users\\Gui\\Documents\\GitHub\\Sistema-de-Fidelidade\\backend\\src\\modules\\admin\\admin.routes.ts', adminContent, 'utf8');
