import { Request, Response, Router } from 'express';
import db from '../../infra/database/db';
import { queryWithRLS, AuthenticatedRequest } from '../../infra/database/db-rls';
import verificaToken from '../../shared/middlewares/autenticacao';
import { logAuditEvent } from '../../shared/auditoria/audit';
import { ensureAdmin, requireTenantId } from './admin.guard';

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
  if (!ensureAdmin(authReq, res, 'Acesso negado.')) {
    return;
  }

  const tenantId = requireTenantId(authReq, res);
  if (!tenantId) {
    return;
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
  if (!ensureAdmin(authReq, res, 'Acesso negado.')) {
    return;
  }

  const { carencia_pontos, expiracao_pontos } = req.body;
  const tenantId = requireTenantId(authReq, res);
  const carencia = Number(carencia_pontos);
  const expiracao = Number(expiracao_pontos);

  if (!Number.isFinite(carencia) || !Number.isFinite(expiracao) || !Number.isInteger(carencia) || !Number.isInteger(expiracao)) {
    return res.status(400).json({ error: 'Valores inválidos. Informe números inteiros.' });
  }
  if (carencia < 0 || expiracao <= 0) {
    return res.status(400).json({ error: 'Valores inválidos. Carência deve ser >= 0 e expiração > 0.' });
  }
  if (!tenantId) {
    return;
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

router.get('/tenant_settings', verificaToken, getTenantSettingsHandler);
router.get('/configuracoes', verificaToken, getTenantSettingsHandler);
router.put('/tenant_settings', verificaToken, updateTenantSettingsHandler);
router.put('/configuracoes', verificaToken, updateTenantSettingsHandler);

export default router;