import db from '../../infra/database/db';
import { Router, Request, Response } from 'express';
import { queryWithRLS, AuthenticatedRequest } from '../../infra/database/db-rls';
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
    const countQuery = `
      SELECT SUM(total) as count FROM (
        SELECT COUNT(*) as total FROM transactions
        UNION ALL
        SELECT COUNT(*) as total FROM redemptions
      ) as combined_counts;
    `;
    const countResult = await queryWithRLS(req as AuthenticatedRequest, countQuery);
    const totalItens = parseInt(countResult.rows[0].count || '0', 10);

    const query = `
      SELECT t.id, t.data_transacao as data, 'Lancamento de Pontos' as acao, c.nome as nome_cliente, u.nome as nome_operador, t.pontos_ganhos as pontos
      FROM transactions t
      LEFT JOIN customers c ON t.cliente_id = c.id
      LEFT JOIN tenant_users u ON t.usuario_id = u.id
      UNION ALL
      SELECT r.id, r.data_resgate as data, rec.nome as acao, c.nome as nome_cliente, u.nome as nome_operador, r.pontos_gastos * -1 as pontos
      FROM redemptions r
      LEFT JOIN customers c ON r.cliente_id = c.id
      LEFT JOIN tenant_users u ON r.usuario_id = u.id
      LEFT JOIN rewards rec ON r.recompensa_id = rec.id
      ORDER BY data DESC
      LIMIT $1 OFFSET $2;
    `;

    const result = await queryWithRLS(req as AuthenticatedRequest, query, [Number(limit), offset]);
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

// POST /usuarios - Criacao controlada de tenant_users
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
      'INSERT INTO tenant_users (user_id, nome, role) VALUES ($1, $2, $3)',     
      [userId, nome, role]
    );

    res.status(201).json({
      message: 'Usuario interno criado com sucesso.',
      usuario: { id: userId, email, nome, role }
    });
  } catch (error: any) {
    console.error('Erro na criacao de funcionario:', error);
    if (error.code === '23505') {
       return res.status(409).json({ error: 'Usuario ja existe na base de tenant_users.' });
    }
    res.status(500).json({ error: 'Erro interno do servidor ao criar usuario.' });
  } finally {
    client.release();
  }
});

// GET /usuarios - Listagem de tenant_users
router.get('/usuarios', verificaToken, async (req: Request, res: Response) => {
  if ((req as any).usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  try {
    const query = `
      SELECT f.id, f.user_id as supabase_id, f.nome, f.role, f.ativo, au.email 
      FROM tenant_users f 
      LEFT JOIN auth.users au ON f.user_id = au.id 
      ORDER BY f.id ASC
    `;
    const result = await queryWithRLS(req as AuthenticatedRequest, query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao listar tenant_users:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

// PUT /usuarios/:id - Edicao de funcionario
router.put('/usuarios/:id', verificaToken, async (req: Request, res: Response) => {
  if ((req as any).usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const { id } = req.params;
  const { nome, role } = req.body;

  if (!nome || !role) {
    return res.status(400).json({ error: 'Nome e role sao obrigatorios.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // Busca user_id (Supabase)
    const funcResult = await client.query('SELECT user_id FROM tenant_users WHERE id = $1', [id]);
    if (funcResult.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionario nao encontrado.' });
    }
    const userId = funcResult.rows[0].user_id;

    // Atualiza metadados no Supabase
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { nome }
    });

    if (authError) {
      throw new Error(authError.message);
    }

    // Atualiza tabela local
    await client.query(
      'UPDATE tenant_users SET nome = $1, role = $2 WHERE id = $3',
      [nome, role, id]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Usuario atualizado com sucesso.' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erro ao editar funcionario:', error);
    res.status(500).json({ error: 'Erro ao editar usuario.' });
  } finally {
    client.release();
  }
});

// PATCH /usuarios/:id/status - Bloquear/Desbloquear
router.patch('/usuarios/:id/status', verificaToken, async (req: Request, res: Response) => {
  if ((req as any).usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const { id } = req.params;
  const { ativo } = req.body; // boolean

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const funcResult = await client.query('SELECT user_id FROM tenant_users WHERE id = $1', [id]);
    if (funcResult.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionario nao encontrado.' });
    }
    const userId = funcResult.rows[0].user_id;

    // Se banido, ban_duration = '876000h' (~100 anos). Senao 'none'.
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: ativo ? 'none' : '876000h'
    });

    if (authError) {
      throw new Error(authError.message);
    }

    await client.query('UPDATE tenant_users SET ativo = $1 WHERE id = $2', [ativo, id]);

    await client.query('COMMIT');
    res.status(200).json({ message: ativo ? 'Usuario desbloqueado.' : 'Usuario bloqueado.' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erro ao alterar status:', error);
    res.status(500).json({ error: 'Erro ao alterar status do usuario.' });
  } finally {
    client.release();
  }
});

// DELETE /usuarios/:id - Excluir usuario
router.delete('/usuarios/:id', verificaToken, async (req: Request, res: Response) => {
  if ((req as any).usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const { id } = req.params;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const funcResult = await client.query('SELECT user_id FROM tenant_users WHERE id = $1', [id]);
    if (funcResult.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionario nao encontrado.' });
    }
    const userId = funcResult.rows[0].user_id;

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      throw new Error(authError.message);
    }

    await client.query('DELETE FROM tenant_users WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.status(200).json({ message: 'Usuario excluido com sucesso.' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Erro ao excluir usuario:', error);
    res.status(500).json({ error: 'Erro ao excluir usuario.' });
  } finally {
    client.release();
  }
});

// GET /admin/tenant_settings - Retorna as configs atuais (apenas admin)
router.get('/tenant_settings', verificaToken, async (req: Request, res: Response) => {
  if ((req as any).usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  try {
    const result = await queryWithRLS(req as AuthenticatedRequest, 'SELECT chave, valor, unidade, updated_at FROM tenant_settings');
    const configs: any = {};
    let lastUpdate = null;

    result.rows.forEach(row => {
      configs[row.chave] = { valor: row.valor, unidade: row.unidade };
      if (!lastUpdate || new Date(row.updated_at) > new Date(lastUpdate)) {
        lastUpdate = row.updated_at;
      }
    });

    res.status(200).json({ configs, lastUpdate });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

// PUT /admin/tenant_settings - Atualiza as configs (apenas admin)
router.put('/tenant_settings', verificaToken, async (req: Request, res: Response) => {
  if ((req as any).usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const { carencia_pontos, expiracao_pontos } = req.body;
  if (carencia_pontos < 0 || expiracao_pontos <= 0) {
    return res.status(400).json({ error: 'Valores inválidos. Carência deve ser >= 0 e expiração > 0.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // Atualizar carencia
    await client.query(`
      INSERT INTO tenant_settings (chave, valor, unidade, updated_at) 
      VALUES ('carencia_pontos', $1, 'dias', NOW())
      ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW()
    `, [parseInt(carencia_pontos)]);

    // Atualizar expiracao
    await client.query(`
      INSERT INTO tenant_settings (chave, valor, unidade, updated_at) 
      VALUES ('expiracao_pontos', $1, 'dias', NOW())
      ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW()
    `, [parseInt(expiracao_pontos)]);

    await client.query('COMMIT');
    res.status(200).json({ message: 'Configurações atualizadas com sucesso!' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Ocorreu um erro ao salvar as configurações.' });
  } finally {
    client.release();
  }
});

export default router;
