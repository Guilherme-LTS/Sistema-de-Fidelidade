import db from '../../infra/database/db';
import { Router, Request, Response } from 'express';
import { queryWithRLS, AuthenticatedRequest } from '../../infra/database/db-rls';
import verificaToken from '../../shared/middlewares/autenticacao';
import { logAuditEvent } from '../../shared/auditoria/audit';

const router = Router();

type TenantSettingRow = {
  setting_key: string;
  setting_value: number;
  setting_unit: string;
  updated_at: string;
};

const buildTenantSettingsPayload = (rows: TenantSettingRow[]) => {
  const configs: Record<string, { valor: number; unidade: string }> = {};
  let lastUpdate: string | null = null;

  rows.forEach((row) => {
    configs[row.setting_key] = { valor: row.setting_value, unidade: row.setting_unit };
    if (!lastUpdate || new Date(row.updated_at) > new Date(lastUpdate)) {
      lastUpdate = row.updated_at;
    }
  });

  return { configs, lastUpdate };
};

const getTenantSettingsHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.usuario?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const tenantId = authReq.usuario?.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant do usuário não identificado.' });
  }

  try {
    const result = await queryWithRLS(
      authReq,
      'SELECT setting_key, setting_value, setting_unit, updated_at FROM tenant_settings WHERE tenant_id = $1',
      [tenantId]
    );
    const payload = buildTenantSettingsPayload(result.rows as TenantSettingRow[]);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
};

const updateTenantSettingsHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.usuario?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const { carencia_pontos, expiracao_pontos } = req.body;
  const tenantId = authReq.usuario?.tenant_id;
  const carencia = Number(carencia_pontos);
  const expiracao = Number(expiracao_pontos);

  if (!Number.isFinite(carencia) || !Number.isFinite(expiracao) || !Number.isInteger(carencia) || !Number.isInteger(expiracao)) {
    return res.status(400).json({ error: 'Valores inválidos. Informe números inteiros.' });
  }
  if (carencia < 0 || expiracao <= 0) {
    return res.status(400).json({ error: 'Valores inválidos. Carência deve ser >= 0 e expiração > 0.' });
  }
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant do usuário não identificado.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_unit, updated_at)
      VALUES ($1, 'carencia_pontos', $2, 'dias', NOW())
      ON CONFLICT (tenant_id, setting_key)
      DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
    `, [tenantId, carencia]);

    await client.query(`
      INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_unit, updated_at)
      VALUES ($1, 'expiracao_pontos', $2, 'dias', NOW())
      ON CONFLICT (tenant_id, setting_key)
      DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
    `, [tenantId, expiracao]);

    await logAuditEvent({
      req,
      client,
      tenantId,
      operatorId: authReq.usuario?.id || null,
      action: 'ALTERACAO_CONFIGURACOES',
      details: `Configurações alteradas: carencia_pontos=${carencia}, expiracao_pontos=${expiracao}.`,
      targetLabel: 'Regras de Pontos',
      impactLabel: `Carência ${carencia}d / Expiração ${expiracao}d`,
      status: 'SUCESSO',
      entityType: 'tenant_settings'
    });

    await client.query('COMMIT');
    return res.status(200).json({ message: 'Configurações atualizadas com sucesso!' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar configurações:', error);
    return res.status(500).json({ error: 'Ocorreu um erro ao salvar as configurações.' });
  } finally {
    client.release();
  }
};

// GET /auditoria - Log de auditoria (apenas admin)
router.get('/auditoria', verificaToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.usuario?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }

  const tenantId = authReq.usuario?.tenant_id;
  const { page = 1, limit = 50, q = '', startDate, endDate, eventType = '', status = '' } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant do usuário não identificado.' });
  }

  const searchText = String(q || '').trim();
  const eventTypeFilter = String(eventType || '').trim();
  const statusFilter = String(status || '').trim().toUpperCase();
  const parsedStartDate = startDate ? new Date(String(startDate)) : null;
  const parsedEndDate = endDate ? new Date(String(endDate)) : null;

  if (parsedStartDate && Number.isNaN(parsedStartDate.getTime())) {
    return res.status(400).json({ error: 'startDate inválida.' });
  }
  if (parsedEndDate && Number.isNaN(parsedEndDate.getTime())) {
    return res.status(400).json({ error: 'endDate inválida.' });
  }

  try {
    const whereClauses: string[] = ['a.tenant_id = $1'];
    const params: Array<string | number | Date> = [tenantId];
    let paramIndex = 2;

    if (searchText) {
      whereClauses.push(`(a.action ILIKE $${paramIndex} OR COALESCE(a.details, '') ILIKE $${paramIndex} OR COALESCE(tu.name, '') ILIKE $${paramIndex} OR COALESCE(a.target_label, '') ILIKE $${paramIndex})`);
      params.push(`%${searchText}%`);
      paramIndex += 1;
    }

    if (eventTypeFilter) {
      whereClauses.push(`a.action = $${paramIndex}`);
      params.push(eventTypeFilter);
      paramIndex += 1;
    }

    if (statusFilter) {
      whereClauses.push(`COALESCE(a.status, 'SUCESSO') = $${paramIndex}`);
      params.push(statusFilter);
      paramIndex += 1;
    }

    if (parsedStartDate) {
      whereClauses.push(`a.created_at >= $${paramIndex}`);
      params.push(parsedStartDate);
      paramIndex += 1;
    }

    if (parsedEndDate) {
      whereClauses.push(`a.created_at <= $${paramIndex}`);
      params.push(parsedEndDate);
      paramIndex += 1;
    }

    const whereSql = whereClauses.join(' AND ');

    let totalItens = 0;
    let totalAuditLogsTenant = 0;
    let hasAuditTable = true;

    try {
      const tenantCountResult = await queryWithRLS(
        authReq,
        `
          SELECT COUNT(*)::int AS count
          FROM audit_logs a
          WHERE a.tenant_id = $1
        `,
        [tenantId]
      );
      totalAuditLogsTenant = tenantCountResult.rows[0]?.count || 0;

      const countResult = await queryWithRLS(
        authReq,
        `
          SELECT COUNT(*)::int AS count
          FROM audit_logs a
          LEFT JOIN tenant_users tu ON tu.id = a.operator_id
          WHERE ${whereSql}
        `,
        params
      );
      totalItens = countResult.rows[0]?.count || 0;
    } catch (error: any) {
      if (error?.code === '42P01') {
        hasAuditTable = false;
      } else {
        throw error;
      }
    }

    if (hasAuditTable && totalAuditLogsTenant > 0) {
      const result = await queryWithRLS(
        authReq,
        `
          SELECT
            a.id,
            a.created_at AS data_hora,
            a.action AS acao,
            a.details AS detalhes,
            COALESCE(a.status, 'SUCESSO') AS status,
            a.target_label AS alvo,
            a.impact_label AS impacto,
            a.ip_address::text AS ip,
            a.operator_id,
            tu.name AS operator_name,
            a.entity_type,
            a.entity_id
          FROM audit_logs a
          LEFT JOIN tenant_users tu ON tu.id = a.operator_id
          WHERE ${whereSql}
          ORDER BY a.created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `,
        [...params, safeLimit, offset]
      );

      const summaryResult = await queryWithRLS(
        authReq,
        `
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE a.action = 'LANCAMENTO_PONTOS')::int AS lancamentos,
            COUNT(*) FILTER (WHERE a.action = 'RESGATE_RECOMPENSA')::int AS resgates,
            COUNT(*) FILTER (WHERE a.action = 'ALTERACAO_CONFIGURACOES')::int AS configuracoes,
            COUNT(*) FILTER (WHERE COALESCE(a.status, 'SUCESSO') = 'FALHA')::int AS falhas
          FROM audit_logs a
          LEFT JOIN tenant_users tu ON tu.id = a.operator_id
          WHERE ${whereSql}
        `,
        params
      );

      return res.status(200).json({
        data: result.rows,
        summary: summaryResult.rows[0] || { total: 0, lancamentos: 0, resgates: 0, configuracoes: 0, falhas: 0 },
        pagination: {
          total: totalItens,
          page: safePage,
          limit: safeLimit,
          totalPages: Math.max(Math.ceil(totalItens / safeLimit), 1)
        }
      });
    }

    if (statusFilter === 'FALHA') {
      return res.status(200).json({
        data: [],
        summary: { total: 0, lancamentos: 0, resgates: 0, configuracoes: 0, falhas: 0 },
        pagination: {
          total: 0,
          page: safePage,
          limit: safeLimit,
          totalPages: 1
        }
      });
    }

    const legacyWhere: string[] = ['legacy.tenant_id = $3'];
    const legacyParams: Array<string | number | Date> = [safeLimit, offset, tenantId];
    let legacyParamIdx = 4;

    if (searchText) {
      legacyWhere.push(`(legacy.acao ILIKE $${legacyParamIdx} OR COALESCE(legacy.detalhes, '') ILIKE $${legacyParamIdx} OR COALESCE(legacy.operator_name, '') ILIKE $${legacyParamIdx} OR COALESCE(legacy.alvo, '') ILIKE $${legacyParamIdx})`);
      legacyParams.push(`%${searchText}%`);
      legacyParamIdx += 1;
    }

    if (eventTypeFilter) {
      legacyWhere.push(`legacy.acao = $${legacyParamIdx}`);
      legacyParams.push(eventTypeFilter);
      legacyParamIdx += 1;
    }

    if (parsedStartDate) {
      legacyWhere.push(`legacy.data_hora >= $${legacyParamIdx}`);
      legacyParams.push(parsedStartDate);
      legacyParamIdx += 1;
    }

    if (parsedEndDate) {
      legacyWhere.push(`legacy.data_hora <= $${legacyParamIdx}`);
      legacyParams.push(parsedEndDate);
      legacyParamIdx += 1;
    }

    const legacyWhereSql = legacyWhere.length > 0 ? `WHERE ${legacyWhere.join(' AND ')}` : '';

    const legacyCountWhere: string[] = ['legacy.tenant_id = $1'];
    const legacyCountParams: Array<string | Date> = [tenantId];
    let legacyCountIdx = 2;

    if (searchText) {
      legacyCountWhere.push(`(legacy.acao ILIKE $${legacyCountIdx} OR COALESCE(legacy.detalhes, '') ILIKE $${legacyCountIdx} OR COALESCE(legacy.operator_name, '') ILIKE $${legacyCountIdx} OR COALESCE(legacy.alvo, '') ILIKE $${legacyCountIdx})`);
      legacyCountParams.push(`%${searchText}%`);
      legacyCountIdx += 1;
    }

    if (eventTypeFilter) {
      legacyCountWhere.push(`legacy.acao = $${legacyCountIdx}`);
      legacyCountParams.push(eventTypeFilter);
      legacyCountIdx += 1;
    }

    if (parsedStartDate) {
      legacyCountWhere.push(`legacy.data_hora >= $${legacyCountIdx}`);
      legacyCountParams.push(parsedStartDate);
      legacyCountIdx += 1;
    }

    if (parsedEndDate) {
      legacyCountWhere.push(`legacy.data_hora <= $${legacyCountIdx}`);
      legacyCountParams.push(parsedEndDate);
      legacyCountIdx += 1;
    }

    const legacyCountWhereSql = legacyCountWhere.length > 0 ? `WHERE ${legacyCountWhere.join(' AND ')}` : '';

    const legacyResult = await queryWithRLS(
      authReq,
      `
        SELECT *
        FROM (
          SELECT
            'tx-' || t.id::text AS id,
            t.created_at AS data_hora,
            'LANCAMENTO_PONTOS' AS acao,
            ('Lancamento de ' || t.points_earned || ' pontos para ' || COALESCE(c.name, 'cliente') || '.') AS detalhes,
            'SUCESSO'::text AS status,
            COALESCE(c.name, 'Cliente') AS alvo,
            ('+' || t.points_earned || ' pts') AS impacto,
            NULL::text AS ip,
            t.operator_id,
            tu.name AS operator_name,
            t.tenant_id,
            'transaction'::text AS entity_type,
            t.id::text AS entity_id
          FROM transactions t
          LEFT JOIN customers c ON c.id = t.customer_id
          LEFT JOIN tenant_users tu ON tu.id = t.operator_id AND tu.tenant_id = t.tenant_id

          UNION ALL

          SELECT
            'rd-' || r.id::text AS id,
            r.created_at AS data_hora,
            'RESGATE_RECOMPENSA' AS acao,
            ('Resgate de ' || COALESCE(rec.name, 'recompensa') || ' por ' || r.points_spent || ' pontos.') AS detalhes,
            'SUCESSO'::text AS status,
            COALESCE(rec.name, 'Recompensa') AS alvo,
            ('-' || r.points_spent || ' pts') AS impacto,
            NULL::text AS ip,
            r.operator_id,
            tu.name AS operator_name,
            r.tenant_id,
            'redemption'::text AS entity_type,
            r.id::text AS entity_id
          FROM redemptions r
          LEFT JOIN rewards rec ON rec.id = r.reward_id AND rec.tenant_id = r.tenant_id
          LEFT JOIN tenant_users tu ON tu.id = r.operator_id AND tu.tenant_id = r.tenant_id
        ) AS legacy
        ${legacyWhereSql}
        ORDER BY legacy.data_hora DESC
        LIMIT $1 OFFSET $2
      `,
      legacyParams
    );

    const legacyCount = await queryWithRLS(
      authReq,
      `
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT
            t.created_at AS data_hora,
            'LANCAMENTO_PONTOS' AS acao,
            ('Lancamento de ' || t.points_earned || ' pontos para ' || COALESCE(c.name, 'cliente') || '.') AS detalhes,
            tu.name AS operator_name,
            t.tenant_id,
            COALESCE(c.name, 'Cliente') AS alvo
          FROM transactions t
          LEFT JOIN customers c ON c.id = t.customer_id
          LEFT JOIN tenant_users tu ON tu.id = t.operator_id AND tu.tenant_id = t.tenant_id

          UNION ALL

          SELECT
            r.created_at AS data_hora,
            'RESGATE_RECOMPENSA' AS acao,
            ('Resgate de ' || COALESCE(rec.name, 'recompensa') || ' por ' || r.points_spent || ' pontos.') AS detalhes,
            tu.name AS operator_name,
            r.tenant_id,
            COALESCE(rec.name, 'Recompensa') AS alvo
          FROM redemptions r
          LEFT JOIN rewards rec ON rec.id = r.reward_id AND rec.tenant_id = r.tenant_id
          LEFT JOIN tenant_users tu ON tu.id = r.operator_id AND tu.tenant_id = r.tenant_id
        ) legacy
        ${legacyCountWhereSql}
      `,
      legacyCountParams
    );

    const summary = legacyResult.rows.reduce((acc: any, row: any) => {
      acc.total += 1;
      if (row.acao === 'LANCAMENTO_PONTOS') acc.lancamentos += 1;
      if (row.acao === 'RESGATE_RECOMPENSA') acc.resgates += 1;
      return acc;
    }, { total: 0, lancamentos: 0, resgates: 0, configuracoes: 0, falhas: 0 });

    res.status(200).json({
      data: legacyResult.rows,
      summary,
      pagination: {
        total: legacyCount.rows[0]?.count || 0,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(Math.ceil((legacyCount.rows[0]?.count || 0) / safeLimit), 1)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar auditoria:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

// POST /usuarios - Criacao controlada de tenant_staff (sem auth.users)
router.post('/usuarios', verificaToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.usuario?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }

  const { email, nome, role = 'operador' } = req.body;
  const tenantId = authReq.usuario?.tenant_id;

  if (!nome) {
    return res.status(400).json({ error: 'Nome é obrigatório.' });
  }

  if (role !== 'admin' && role !== 'operador') {
    return res.status(400).json({ error: 'Role invalida.' });
  }
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant do usuário não identificado.' });
  }

  const client = await db.connect();
  try {
    const insertResult = await client.query(
      'INSERT INTO tenant_staff (tenant_id, name, email, role, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id, name, email, role, is_active',
      [tenantId, nome, email || null, role]
    );

    res.status(201).json({
      message: 'Usuario interno criado com sucesso.',
      usuario: {
        id: insertResult.rows[0].id,
        nome: insertResult.rows[0].name,
        email: insertResult.rows[0].email,
        role: insertResult.rows[0].role,
        ativo: insertResult.rows[0].is_active
      }
    });
  } catch (error: any) {
    console.error('Erro na criacao de funcionario:', error);
    if (error.code === '23505') {
       return res.status(409).json({ error: 'Já existe um usuário com este e-mail neste restaurante.' });
    }
    res.status(500).json({ error: 'Erro interno do servidor ao criar usuario.' });
  } finally {
    client.release();
  }
});

// GET /usuarios - Listagem de tenant_staff
router.get('/usuarios', verificaToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.usuario?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  const tenantId = authReq.usuario?.tenant_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant do usuário não identificado.' });
  }
  try {
    const query = `
      SELECT f.id, f.name, f.role, f.is_active, f.email
      FROM tenant_staff f
      WHERE f.tenant_id = $1
        AND f.deleted_at IS NULL
      ORDER BY f.id ASC
    `;
    const result = await queryWithRLS(authReq, query, [tenantId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao listar tenant_staff:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

// PUT /usuarios/:id - Edicao de funcionario
router.put('/usuarios/:id', verificaToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.usuario?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const { id } = req.params;
  const { nome, role, email } = req.body;
  const tenantId = authReq.usuario?.tenant_id;

  if (!nome || !role) {
    return res.status(400).json({ error: 'Nome e role sao obrigatorios.' });
  }
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant do usuário não identificado.' });
  }

  const client = await db.connect();
  try {
    const updateResult = await client.query(
      'UPDATE tenant_staff SET name = $1, role = $2, email = $3 WHERE id = $4 AND tenant_id = $5 AND deleted_at IS NULL RETURNING id',
      [nome, role, email || null, id, tenantId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionario nao encontrado.' });
    }

    res.status(200).json({ message: 'Usuario atualizado com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao editar funcionario:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Já existe um usuário com este e-mail neste restaurante.' });
    }
    res.status(500).json({ error: 'Erro ao editar usuario.' });
  } finally {
    client.release();
  }
});

// PATCH /usuarios/:id/status - Bloquear/Desbloquear
router.patch('/usuarios/:id/status', verificaToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.usuario?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const { id } = req.params;
  const { ativo } = req.body; // boolean
  const tenantId = authReq.usuario?.tenant_id;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant do usuário não identificado.' });
  }

  const client = await db.connect();
  try {
    const updateResult = await client.query(
      'UPDATE tenant_staff SET is_active = $1 WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL RETURNING id',
      [ativo, id, tenantId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionario nao encontrado.' });
    }

    res.status(200).json({ message: ativo ? 'Usuario desbloqueado.' : 'Usuario bloqueado.' });
  } catch (error: any) {
    console.error('Erro ao alterar status:', error);
    res.status(500).json({ error: 'Erro ao alterar status do usuario.' });
  } finally {
    client.release();
  }
});

// DELETE /usuarios/:id - Excluir usuario
router.delete('/usuarios/:id', verificaToken, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.usuario?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const { id } = req.params;
  const tenantId = authReq.usuario?.tenant_id;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant do usuário não identificado.' });
  }

  const client = await db.connect();
  try {
    const deleteResult = await client.query(
      'UPDATE tenant_staff SET deleted_at = NOW(), is_active = false WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id',
      [id, tenantId]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionario nao encontrado.' });
    }

    res.status(200).json({ message: 'Usuario excluido com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir usuario:', error);
    res.status(500).json({ error: 'Erro ao excluir usuario.' });
  } finally {
    client.release();
  }
});

// GET /admin/tenant_settings - Retorna as configs atuais (apenas admin)
router.get('/tenant_settings', verificaToken, getTenantSettingsHandler);

// GET /admin/configuracoes - Alias legado para compatibilidade
router.get('/configuracoes', verificaToken, getTenantSettingsHandler);

// PUT /admin/tenant_settings - Atualiza as configs (apenas admin)
router.put('/tenant_settings', verificaToken, updateTenantSettingsHandler);

// PUT /admin/configuracoes - Alias legado para compatibilidade
router.put('/configuracoes', verificaToken, updateTenantSettingsHandler);

export default router;
