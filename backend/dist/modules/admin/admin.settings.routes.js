"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../../infra/database/db"));
const db_rls_1 = require("../../infra/database/db-rls");
const autenticacao_1 = __importDefault(require("../../shared/middlewares/autenticacao"));
const audit_1 = require("../../shared/auditoria/audit");
const admin_guard_1 = require("./admin.guard");
const router = (0, express_1.Router)();
const buildTenantSettingsPayload = (rows) => {
    const configs = {};
    let lastUpdate = null;
    rows.forEach((row) => {
        configs[row.setting_key] = { valor: row.setting_value, unidade: row.setting_unit };
        if (!lastUpdate || new Date(row.updated_at) > new Date(lastUpdate)) {
            lastUpdate = row.updated_at;
        }
    });
    return { configs, lastUpdate };
};
const getTenantSettingsHandler = async (req, res) => {
    const authReq = req;
    if (!(0, admin_guard_1.ensureAdmin)(authReq, res, 'Acesso negado.')) {
        return;
    }
    const tenantId = (0, admin_guard_1.requireTenantId)(authReq, res);
    if (!tenantId) {
        return;
    }
    try {
        const result = await (0, db_rls_1.queryWithRLS)(authReq, 'SELECT setting_key, setting_value, setting_unit, updated_at FROM tenant_settings WHERE tenant_id = $1', [tenantId]);
        const payload = buildTenantSettingsPayload(result.rows);
        return res.status(200).json(payload);
    }
    catch (error) {
        console.error('Erro ao buscar configurações:', error);
        return res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
};
const updateTenantSettingsHandler = async (req, res) => {
    const authReq = req;
    if (!(0, admin_guard_1.ensureAdmin)(authReq, res, 'Acesso negado.')) {
        return;
    }
    const { carencia_pontos, expiracao_pontos } = req.body;
    const tenantId = (0, admin_guard_1.requireTenantId)(authReq, res);
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
    const client = await db_1.default.connect();
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
        await (0, audit_1.logAuditEvent)({
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
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar configurações:', error);
        return res.status(500).json({ error: 'Ocorreu um erro ao salvar as configurações.' });
    }
    finally {
        client.release();
    }
};
router.get('/tenant_settings', autenticacao_1.default, getTenantSettingsHandler);
router.get('/configuracoes', autenticacao_1.default, getTenantSettingsHandler);
router.put('/tenant_settings', autenticacao_1.default, updateTenantSettingsHandler);
router.put('/configuracoes', autenticacao_1.default, updateTenantSettingsHandler);
exports.default = router;
