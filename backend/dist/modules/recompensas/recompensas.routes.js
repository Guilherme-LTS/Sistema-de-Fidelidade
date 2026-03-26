"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../../infra/database/db"));
const autenticacao_1 = __importDefault(require("../../shared/middlewares/autenticacao"));
const router = (0, express_1.Router)();
// GET /recompensas - Listar todas as recompensas (protegido)
router.get('/', autenticacao_1.default, async (req, res) => {
    try {
        const result = await db_1.default.query('SELECT * FROM recompensas WHERE ativo = true ORDER BY custo_pontos ASC');
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Erro ao buscar recompensas:', error);
        res.status(500).json({ error: 'Erro ao buscar recompensas.' });
    }
});
// GET /recompensas/publica - Listar recompensas públicas (sem protecção)
router.get('/publica', async (req, res) => {
    try {
        const result = await db_1.default.query('SELECT nome, custo_pontos FROM recompensas WHERE ativo = true ORDER BY custo_pontos ASC');
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Erro ao buscar recompensas públicas:', error);
        res.status(500).json({ error: 'Erro ao buscar recompensas.' });
    }
});
// POST /recompensas - Criar nova recompensa (protegido)
router.post('/', autenticacao_1.default, async (req, res) => {
    const { nome, descricao, custo_pontos } = req.body;
    if (!nome || !custo_pontos) {
        return res.status(400).json({ error: 'Nome e custo em pontos são obrigatórios.' });
    }
    try {
        const novaRecompensa = await db_1.default.query('INSERT INTO recompensas (nome, descricao, custo_pontos) VALUES ($1, $2, $3) RETURNING *', [nome, descricao, custo_pontos]);
        res.status(201).json(novaRecompensa.rows[0]);
    }
    catch (error) {
        console.error('Erro ao criar recompensa:', error);
        res.status(500).json({ error: 'Erro no servidor ao criar recompensa.' });
    }
});
// PUT /recompensas/:id - Atualizar recompensa (protegido)
router.put('/:id', autenticacao_1.default, async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, custo_pontos } = req.body;
    if (!nome || !custo_pontos) {
        return res.status(400).json({ error: 'Nome e custo em pontos são obrigatórios.' });
    }
    try {
        const recompensaAtualizada = await db_1.default.query('UPDATE recompensas SET nome = $1, descricao = $2, custo_pontos = $3 WHERE id = $4 RETURNING *', [nome, descricao, custo_pontos, id]);
        if (recompensaAtualizada.rows.length === 0) {
            return res.status(404).json({ error: 'Recompensa não encontrada.' });
        }
        res.status(200).json(recompensaAtualizada.rows[0]);
    }
    catch (error) {
        console.error('Erro ao atualizar recompensa:', error);
        res.status(500).json({ error: 'Erro no servidor ao atualizar recompensa.' });
    }
});
// DELETE /recompensas/:id - Desativar recompensa (protegido)
router.delete('/:id', autenticacao_1.default, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db_1.default.query("UPDATE recompensas SET ativo = false WHERE id = $1 RETURNING *", [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Recompensa não encontrada.' });
        }
        res.status(200).json({ message: 'Recompensa desativada com sucesso!' });
    }
    catch (error) {
        console.error('Erro ao desativar recompensa:', error);
        res.status(500).json({ error: 'Erro no servidor ao desativar recompensa.' });
    }
});
exports.default = router;
