"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../../infra/database/db"));
const db_rls_1 = require("../../infra/database/db-rls");
const autenticacao_1 = __importDefault(require("../../shared/middlewares/autenticacao"));
const admin_guard_1 = require("./admin.guard");
const router = (0, express_1.Router)();
router.post('/usuarios', autenticacao_1.default, async (req, res) => {
    const authReq = req;
    if (!(0, admin_guard_1.ensureAdmin)(authReq, res)) {
        return;
    }
    const { email, nome, role = 'operador' } = req.body;
    const tenantId = (0, admin_guard_1.requireTenantId)(authReq, res);
    if (!tenantId) {
        return;
    }
    if (!nome) {
        return res.status(400).json({ error: 'Nome é obrigatório.' });
    }
    if (role !== 'admin' && role !== 'operador') {
        return res.status(400).json({ error: 'Role invalida.' });
    }
    const client = await db_1.default.connect();
    try {
        const insertResult = await client.query('INSERT INTO tenant_staff (tenant_id, name, email, role, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id, name, email, role, is_active', [tenantId, nome, email || null, role]);
        return res.status(201).json({
            message: 'Usuario interno criado com sucesso.',
            usuario: {
                id: insertResult.rows[0].id,
                nome: insertResult.rows[0].name,
                email: insertResult.rows[0].email,
                role: insertResult.rows[0].role,
                ativo: insertResult.rows[0].is_active
            }
        });
    }
    catch (error) {
        console.error('Erro na criacao de funcionario:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Já existe um usuário com este e-mail neste restaurante.' });
        }
        return res.status(500).json({ error: 'Erro interno do servidor ao criar usuario.' });
    }
    finally {
        client.release();
    }
});
router.get('/usuarios', autenticacao_1.default, async (req, res) => {
    const authReq = req;
    if (!(0, admin_guard_1.ensureAdmin)(authReq, res)) {
        return;
    }
    const tenantId = (0, admin_guard_1.requireTenantId)(authReq, res);
    if (!tenantId) {
        return;
    }
    try {
        const query = `
      SELECT f.id, f.name, f.role, f.is_active, f.email
      FROM tenant_staff f
      WHERE f.tenant_id = $1
        AND f.deleted_at IS NULL
      ORDER BY f.id ASC
    `;
        const result = await (0, db_rls_1.queryWithRLS)(authReq, query, [tenantId]);
        return res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Erro ao listar tenant_staff:', error);
        return res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
});
router.put('/usuarios/:id', autenticacao_1.default, async (req, res) => {
    const authReq = req;
    if (!(0, admin_guard_1.ensureAdmin)(authReq, res)) {
        return;
    }
    const { id } = req.params;
    const { nome, role, email } = req.body;
    const tenantId = (0, admin_guard_1.requireTenantId)(authReq, res);
    if (!tenantId) {
        return;
    }
    if (!nome || !role) {
        return res.status(400).json({ error: 'Nome e role sao obrigatorios.' });
    }
    const client = await db_1.default.connect();
    try {
        const updateResult = await client.query('UPDATE tenant_staff SET name = $1, role = $2, email = $3 WHERE id = $4 AND tenant_id = $5 AND deleted_at IS NULL RETURNING id', [nome, role, email || null, id, tenantId]);
        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Funcionario nao encontrado.' });
        }
        return res.status(200).json({ message: 'Usuario atualizado com sucesso.' });
    }
    catch (error) {
        console.error('Erro ao editar funcionario:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Já existe um usuário com este e-mail neste restaurante.' });
        }
        return res.status(500).json({ error: 'Erro ao editar usuario.' });
    }
    finally {
        client.release();
    }
});
router.patch('/usuarios/:id/status', autenticacao_1.default, async (req, res) => {
    const authReq = req;
    if (!(0, admin_guard_1.ensureAdmin)(authReq, res)) {
        return;
    }
    const { id } = req.params;
    const { ativo } = req.body;
    const tenantId = (0, admin_guard_1.requireTenantId)(authReq, res);
    if (!tenantId) {
        return;
    }
    const client = await db_1.default.connect();
    try {
        const updateResult = await client.query('UPDATE tenant_staff SET is_active = $1 WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL RETURNING id', [ativo, id, tenantId]);
        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Funcionario nao encontrado.' });
        }
        return res.status(200).json({ message: ativo ? 'Usuario desbloqueado.' : 'Usuario bloqueado.' });
    }
    catch (error) {
        console.error('Erro ao alterar status:', error);
        return res.status(500).json({ error: 'Erro ao alterar status do usuario.' });
    }
    finally {
        client.release();
    }
});
router.delete('/usuarios/:id', autenticacao_1.default, async (req, res) => {
    const authReq = req;
    if (!(0, admin_guard_1.ensureAdmin)(authReq, res)) {
        return;
    }
    const { id } = req.params;
    const tenantId = (0, admin_guard_1.requireTenantId)(authReq, res);
    if (!tenantId) {
        return;
    }
    const client = await db_1.default.connect();
    try {
        const deleteResult = await client.query('UPDATE tenant_staff SET deleted_at = NOW(), is_active = false WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id', [id, tenantId]);
        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Funcionario nao encontrado.' });
        }
        return res.status(200).json({ message: 'Usuario excluido com sucesso.' });
    }
    catch (error) {
        console.error('Erro ao excluir usuario:', error);
        return res.status(500).json({ error: 'Erro ao excluir usuario.' });
    }
    finally {
        client.release();
    }
});
exports.default = router;
