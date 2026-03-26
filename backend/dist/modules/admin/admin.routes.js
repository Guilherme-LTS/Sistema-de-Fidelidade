"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../../infra/database/db"));
const autenticacao_1 = __importDefault(require("../../shared/middlewares/autenticacao"));
const supabase_1 = require("../../shared/supabase");
const router = (0, express_1.Router)();
// GET /auditoria - Log de auditoria (apenas admin)
router.get('/auditoria', autenticacao_1.default, async (req, res) => {
    if (req.usuario.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    try {
        const countQuery = `
      SELECT SUM(total) as count FROM (
        SELECT COUNT(*) as total FROM transacoes
        UNION ALL
        SELECT COUNT(*) as total FROM resgates
      ) as combined_counts;
    `;
        const countResult = await db_1.default.query(countQuery);
        const totalItens = parseInt(countResult.rows[0].count || '0', 10);
        const query = `
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
      LIMIT $1 OFFSET $2;
    `;
        const result = await db_1.default.query(query, [Number(limit), offset]);
        res.status(200).json({
            data: result.rows,
            pagination: {
                total: totalItens,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalItens / Number(limit))
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
});
// POST /usuarios - Criacao controlada de funcionarios
router.post('/usuarios', autenticacao_1.default, async (req, res) => {
    if (req.usuario.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    const { email, password, nome, role = 'operador' } = req.body;
    if (!email || !password || !nome) {
        return res.status(400).json({ error: 'Email, senha e nome sao obrigatorios.' });
    }
    if (role !== 'admin' && role !== 'operador') {
        return res.status(400).json({ error: 'Role invalida.' });
    }
    const client = await db_1.default.connect();
    try {
        const { data: authData, error: authError } = await supabase_1.supabaseAdmin.auth.admin.createUser({
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
        await client.query('INSERT INTO funcionarios (user_id, nome, role) VALUES ($1, $2, $3)', [userId, nome, role]);
        res.status(201).json({
            message: 'Usuario interno criado com sucesso.',
            usuario: { id: userId, email, nome, role }
        });
    }
    catch (error) {
        console.error('Erro na criacao de funcionario:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Usuario ja existe na base de funcionarios.' });
        }
        res.status(500).json({ error: 'Erro interno do servidor ao criar usuario.' });
    }
    finally {
        client.release();
    }
});
// GET /usuarios - Listagem de funcionarios
router.get('/usuarios', autenticacao_1.default, async (req, res) => {
    if (req.usuario.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    try {
        const query = `
      SELECT f.id, f.user_id as supabase_id, f.nome, f.role, f.ativo, au.email 
      FROM funcionarios f 
      LEFT JOIN auth.users au ON f.user_id = au.id 
      ORDER BY f.id ASC
    `;
        const result = await db_1.default.query(query);
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Erro ao listar funcionarios:', error);
        res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
});
// PUT /usuarios/:id - Edicao de funcionario
router.put('/usuarios/:id', autenticacao_1.default, async (req, res) => {
    if (req.usuario.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado.' });
    }
    const { id } = req.params;
    const { nome, role } = req.body;
    if (!nome || !role) {
        return res.status(400).json({ error: 'Nome e role sao obrigatorios.' });
    }
    const client = await db_1.default.connect();
    try {
        await client.query('BEGIN');
        // Busca user_id (Supabase)
        const funcResult = await client.query('SELECT user_id FROM funcionarios WHERE id = $1', [id]);
        if (funcResult.rows.length === 0) {
            return res.status(404).json({ error: 'Funcionario nao encontrado.' });
        }
        const userId = funcResult.rows[0].user_id;
        // Atualiza metadados no Supabase
        const { error: authError } = await supabase_1.supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { nome }
        });
        if (authError) {
            throw new Error(authError.message);
        }
        // Atualiza tabela local
        await client.query('UPDATE funcionarios SET nome = $1, role = $2 WHERE id = $3', [nome, role, id]);
        await client.query('COMMIT');
        res.status(200).json({ message: 'Usuario atualizado com sucesso.' });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao editar funcionario:', error);
        res.status(500).json({ error: 'Erro ao editar usuario.' });
    }
    finally {
        client.release();
    }
});
// PATCH /usuarios/:id/status - Bloquear/Desbloquear
router.patch('/usuarios/:id/status', autenticacao_1.default, async (req, res) => {
    if (req.usuario.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado.' });
    }
    const { id } = req.params;
    const { ativo } = req.body; // boolean
    const client = await db_1.default.connect();
    try {
        await client.query('BEGIN');
        const funcResult = await client.query('SELECT user_id FROM funcionarios WHERE id = $1', [id]);
        if (funcResult.rows.length === 0) {
            return res.status(404).json({ error: 'Funcionario nao encontrado.' });
        }
        const userId = funcResult.rows[0].user_id;
        // Se banido, ban_duration = '876000h' (~100 anos). Senao 'none'.
        const { error: authError } = await supabase_1.supabaseAdmin.auth.admin.updateUserById(userId, {
            ban_duration: ativo ? 'none' : '876000h'
        });
        if (authError) {
            throw new Error(authError.message);
        }
        await client.query('UPDATE funcionarios SET ativo = $1 WHERE id = $2', [ativo, id]);
        await client.query('COMMIT');
        res.status(200).json({ message: ativo ? 'Usuario desbloqueado.' : 'Usuario bloqueado.' });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao alterar status:', error);
        res.status(500).json({ error: 'Erro ao alterar status do usuario.' });
    }
    finally {
        client.release();
    }
});
// DELETE /usuarios/:id - Excluir usuario
router.delete('/usuarios/:id', autenticacao_1.default, async (req, res) => {
    if (req.usuario.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado.' });
    }
    const { id } = req.params;
    const client = await db_1.default.connect();
    try {
        await client.query('BEGIN');
        const funcResult = await client.query('SELECT user_id FROM funcionarios WHERE id = $1', [id]);
        if (funcResult.rows.length === 0) {
            return res.status(404).json({ error: 'Funcionario nao encontrado.' });
        }
        const userId = funcResult.rows[0].user_id;
        const { error: authError } = await supabase_1.supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
            throw new Error(authError.message);
        }
        await client.query('DELETE FROM funcionarios WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.status(200).json({ message: 'Usuario excluido com sucesso.' });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao excluir usuario:', error);
        res.status(500).json({ error: 'Erro ao excluir usuario.' });
    }
    finally {
        client.release();
    }
});
// GET /admin/configuracoes - Retorna as configs atuais (apenas admin)
router.get('/configuracoes', autenticacao_1.default, async (req, res) => {
    if (req.usuario.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado.' });
    }
    try {
        const result = await db_1.default.query('SELECT chave, valor, unidade, updated_at FROM configuracoes');
        const configs = {};
        let lastUpdate = null;
        result.rows.forEach(row => {
            configs[row.chave] = { valor: row.valor, unidade: row.unidade };
            if (!lastUpdate || new Date(row.updated_at) > new Date(lastUpdate)) {
                lastUpdate = row.updated_at;
            }
        });
        res.status(200).json({ configs, lastUpdate });
    }
    catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
});
// PUT /admin/configuracoes - Atualiza as configs (apenas admin)
router.put('/configuracoes', autenticacao_1.default, async (req, res) => {
    if (req.usuario.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado.' });
    }
    const { carencia_pontos, expiracao_pontos } = req.body;
    if (carencia_pontos < 0 || expiracao_pontos <= 0) {
        return res.status(400).json({ error: 'Valores inválidos. Carência deve ser >= 0 e expiração > 0.' });
    }
    const client = await db_1.default.connect();
    try {
        await client.query('BEGIN');
        // Atualizar carencia
        await client.query(`
      INSERT INTO configuracoes (chave, valor, unidade, updated_at) 
      VALUES ('carencia_pontos', $1, 'dias', NOW())
      ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW()
    `, [parseInt(carencia_pontos)]);
        // Atualizar expiracao
        await client.query(`
      INSERT INTO configuracoes (chave, valor, unidade, updated_at) 
      VALUES ('expiracao_pontos', $1, 'dias', NOW())
      ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW()
    `, [parseInt(expiracao_pontos)]);
        await client.query('COMMIT');
        res.status(200).json({ message: 'Configurações atualizadas com sucesso!' });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar configurações:', error);
        res.status(500).json({ error: 'Ocorreu um erro ao salvar as configurações.' });
    }
    finally {
        client.release();
    }
});
exports.default = router;
