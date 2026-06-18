import { Request, Response, Router } from 'express';
import { AuthenticatedRequest, queryWithRLS, withRlsTransaction } from '../../infra/database/db-rls';
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
      [tenantId],
    );
    const payload = buildTenantSettingsPayload(result.rows as TenantSettingRow[]);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Erro ao buscar configuracoes:', error);
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
    return res.status(400).json({ error: 'Valores invalidos. Informe numeros inteiros.' });
  }
  if (carencia < 0 || expiracao <= 0) {
    return res.status(400).json({ error: 'Valores invalidos. Carencia deve ser >= 0 e expiracao > 0.' });
  }
  if (!tenantId) {
    return;
  }

  try {
    await withRlsTransaction(authReq, async (client) => {
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
        details: `Configuracoes alteradas: carencia_pontos=${carencia}, expiracao_pontos=${expiracao}.`,
        targetLabel: 'Regras de Pontos',
        impactLabel: `Carencia ${carencia}d / Expiracao ${expiracao}d`,
        status: 'SUCESSO',
        entityType: 'tenant_settings',
      });
    });

    return res.status(200).json({ message: 'Configuracoes atualizadas com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar configuracoes:', error);
    return res.status(500).json({ error: 'Ocorreu um erro ao salvar as configuracoes.' });
  }
};

const getTenantProfileHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (!ensureAdmin(authReq, res, 'Acesso negado.')) return;
  const tenantId = requireTenantId(authReq, res);
  if (!tenantId) return;

  try {
    const result = await queryWithRLS(
      authReq,
      `SELECT name, document, address_street, address_number, address_neighborhood, 
              address_city, address_state, address_zip, latitude, longitude, 
              whatsapp, instagram, facebook, tiktok, logo_url 
       FROM tenants WHERE id = $1`,
      [tenantId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant não encontrado.' });
    }
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar perfil do tenant:', error);
    return res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
};

const updateTenantProfileHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (!ensureAdmin(authReq, res, 'Acesso negado.')) return;
  const tenantId = requireTenantId(authReq, res);
  if (!tenantId) return;

  const { 
    name, document, address_street, address_number, address_neighborhood, 
    address_city, address_state, address_zip, latitude, longitude, 
    whatsapp, instagram, facebook, tiktok, logo_url
  } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'O nome do restaurante é obrigatório.' });
  }

  const sanitizeUrl = (url: string) => {
    if (!url) return null;
    const trimmed = url.trim();
    if (trimmed === '') return null;
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const sanitizePhone = (phone: string) => {
    if (!phone) return null;
    return phone.replace(/\D/g, '');
  };

  const cleanWhatsapp = sanitizePhone(whatsapp);
  const cleanInstagram = sanitizeUrl(instagram);
  const cleanFacebook = sanitizeUrl(facebook);
  const cleanTiktok = sanitizeUrl(tiktok);

  try {
    await withRlsTransaction(authReq, async (client) => {
      await client.query(`
        UPDATE tenants 
        SET name = $1, document = $2, address_street = $3, address_number = $4,
            address_neighborhood = $5, address_city = $6, address_state = $7,
            address_zip = $8, latitude = $9, longitude = $10,
            whatsapp = $11, instagram = $12, facebook = $13, tiktok = $14,
            logo_url = $15, updated_at = NOW()
        WHERE id = $16
      `, [
        name, document, address_street, address_number, address_neighborhood,
        address_city, address_state, address_zip, latitude, longitude,
        cleanWhatsapp, cleanInstagram, cleanFacebook, cleanTiktok, logo_url, tenantId
      ]);

      await logAuditEvent({
        req,
        client,
        tenantId,
        operatorId: authReq.usuario?.id || null,
        action: 'ALTERACAO_PERFIL_RESTAURANTE',
        details: `Perfil atualizado: Nome=${name}, Documento=${document}`,
        targetLabel: 'Perfil da Empresa',
        impactLabel: `Nome: ${name}`,
        status: 'SUCESSO',
        entityType: 'tenants',
      });
    });

    return res.status(200).json({ message: 'Perfil atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar perfil do tenant:', error);
    return res.status(500).json({ error: 'Ocorreu um erro ao salvar o perfil.' });
  }
};

router.get('/tenant_settings', verificaToken, getTenantSettingsHandler);
router.get('/configuracoes', verificaToken, getTenantSettingsHandler);
router.put('/tenant_settings', verificaToken, updateTenantSettingsHandler);
router.put('/configuracoes', verificaToken, updateTenantSettingsHandler);

router.get('/profile', verificaToken, getTenantProfileHandler);
router.put('/profile', verificaToken, updateTenantProfileHandler);

export default router;
