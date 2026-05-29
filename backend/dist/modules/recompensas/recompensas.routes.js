"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_rls_1 = require("../../infra/database/db-rls");
const autenticacao_1 = __importDefault(require("../../shared/middlewares/autenticacao"));
const audit_1 = require("../../shared/auditoria/audit");
const request_context_1 = require("../../shared/request-context");
const router = (0, express_1.Router)();
// GET /rewards - Listar todas as rewards (protegido)
router.get('/', autenticacao_1.default, async (req, res) => {
    const authReq = req;
    const tenantId = (0, request_context_1.getTenantId)(authReq);
    if (!tenantId) {
        return res.status(400).json({ error: request_context_1.TENANT_NOT_FOUND_ERROR });
    }
    try {
        const result = await (0, db_rls_1.queryWithRLS)(authReq, 'SELECT * FROM rewards WHERE tenant_id = $1 AND is_active = true ORDER BY points_cost ASC', [tenantId]);
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Erro ao buscar rewards:', error);
        res.status(500).json({ error: 'Erro ao buscar rewards.' });
    }
});
// GET /rewards/publica - Listar rewards públicas (protegido por JWT)
router.get('/publica', autenticacao_1.default, async (req, res) => {
    const authReq = req;
    const tenantId = (0, request_context_1.getTenantId)(authReq);
    if (!tenantId) {
        return res.status(400).json({ error: request_context_1.TENANT_NOT_FOUND_ERROR });
    }
    try {
        const result = await (0, db_rls_1.queryWithRLS)(authReq, 'SELECT id, name, description, points_cost FROM rewards WHERE tenant_id = $1 AND is_active = true ORDER BY points_cost ASC', [tenantId]);
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Erro ao buscar rewards públicas:', error);
        res.status(500).json({ error: 'Erro ao buscar rewards.' });
    }
});
// POST /rewards - Criar nova recompensa (protegido)
router.post('/', autenticacao_1.default, async (req, res) => {
    const authReq = req;
    const tenantId = (0, request_context_1.getTenantId)(authReq);
    const nome = req.body.nome ?? req.body.name;
    const descricao = req.body.descricao ?? req.body.description;
    const custoPontos = req.body.custo_pontos ?? req.body.points_cost;
    if (!nome || custoPontos === undefined || custoPontos === null || custoPontos === '') {
        return res.status(400).json({ error: 'Nome e custo em pontos são obrigatórios.' });
    }
    if (!tenantId) {
        return res.status(400).json({ error: request_context_1.TENANT_NOT_FOUND_ERROR });
    }
    try {
        const novaRecompensa = await (0, db_rls_1.queryWithRLS)(authReq, 'INSERT INTO rewards (name, description, points_cost, tenant_id) VALUES ($1, $2, $3, $4) RETURNING *', [nome, descricao, Number(custoPontos), tenantId]);
        await (0, audit_1.logAuditEvent)({
            req,
            tenantId,
            operatorId: authReq.usuario?.id || null,
            action: 'CRIACAO_RECOMPENSA',
            details: `Recompensa criada: ${nome} (${Number(custoPontos)} pontos).`,
            targetLabel: String(nome),
            impactLabel: `-${Number(custoPontos)} pts (custo)`,
            status: 'SUCESSO',
            entityType: 'reward',
            entityId: novaRecompensa.rows[0]?.id
        });
        res.status(201).json(novaRecompensa.rows[0]);
    }
    catch (error) {
        console.error('Erro ao criar recompensa:', error);
        res.status(500).json({ error: 'Erro no servidor ao criar recompensa.' });
    }
});
// PUT /rewards/:id - Atualizar recompensa (protegido)
router.put('/:id', autenticacao_1.default, async (req, res) => {
    const authReq = req;
    const tenantId = (0, request_context_1.getTenantId)(authReq);
    const { id } = req.params;
    const nome = req.body.nome ?? req.body.name;
    const descricao = req.body.descricao ?? req.body.description;
    const custoPontos = req.body.custo_pontos ?? req.body.points_cost;
    if (!nome || custoPontos === undefined || custoPontos === null || custoPontos === '') {
        return res.status(400).json({ error: 'Nome e custo em pontos são obrigatórios.' });
    }
    if (!tenantId) {
        return res.status(400).json({ error: request_context_1.TENANT_NOT_FOUND_ERROR });
    }
    try {
        const recompensaAtualizada = await (0, db_rls_1.queryWithRLS)(authReq, 'UPDATE rewards SET name = $1, description = $2, points_cost = $3 WHERE id = $4 AND tenant_id = $5 RETURNING *', [nome, descricao, Number(custoPontos), id, tenantId]);
        if (recompensaAtualizada.rows.length === 0) {
            return res.status(404).json({ error: 'Recompensa não encontrada.' });
        }
        await (0, audit_1.logAuditEvent)({
            req,
            tenantId,
            operatorId: authReq.usuario?.id || null,
            action: 'EDICAO_RECOMPENSA',
            details: `Recompensa atualizada: ${nome} (${Number(custoPontos)} pontos).`,
            targetLabel: String(nome),
            impactLabel: `-${Number(custoPontos)} pts (custo)`,
            status: 'SUCESSO',
            entityType: 'reward',
            entityId: recompensaAtualizada.rows[0]?.id
        });
        res.status(200).json(recompensaAtualizada.rows[0]);
    }
    catch (error) {
        console.error('Erro ao atualizar recompensa:', error);
        res.status(500).json({ error: 'Erro no servidor ao atualizar recompensa.' });
    }
});
// DELETE /rewards/:id - Desativar recompensa (protegido)
router.delete('/:id', autenticacao_1.default, async (req, res) => {
    const authReq = req;
    const tenantId = (0, request_context_1.getTenantId)(authReq);
    const { id } = req.params;
    if (!tenantId) {
        return res.status(400).json({ error: request_context_1.TENANT_NOT_FOUND_ERROR });
    }
    try {
        const result = await (0, db_rls_1.queryWithRLS)(authReq, 'UPDATE rewards SET is_active = false WHERE id = $1 AND tenant_id = $2 RETURNING *', [id, tenantId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Recompensa não encontrada.' });
        }
        await (0, audit_1.logAuditEvent)({
            req,
            tenantId,
            operatorId: authReq.usuario?.id || null,
            action: 'DESATIVACAO_RECOMPENSA',
            details: `Recompensa ID ${id} desativada.`,
            targetLabel: `Recompensa #${id}`,
            impactLabel: 'Inativada',
            status: 'SUCESSO',
            entityType: 'reward',
            entityId: String(id)
        });
        res.status(200).json({ message: 'Recompensa desativada com sucesso!' });
    }
    catch (error) {
        console.error('Erro ao desativar recompensa:', error);
        res.status(500).json({ error: 'Erro no servidor ao desativar recompensa.' });
    }
});
exports.default = router;
