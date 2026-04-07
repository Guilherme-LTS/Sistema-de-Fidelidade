"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../../infra/database/db"));
const autenticacao_1 = __importDefault(require("../../shared/middlewares/autenticacao"));
const cpf_cnpj_validator_1 = require("cpf-cnpj-validator");
const router = (0, express_1.Router)();
// GET /clientes - Listar clientes com busca e paginação
router.get('/', autenticacao_1.default, async (req, res) => {
    const { busca, page = 1, limit = 15 } = req.query;
    try {
        const offset = (page - 1) * limit;
        let totalClientes;
        let clientes;
        if (busca && busca.trim() !== '') {
            const termoBuscaNome = `%${busca}%`;
            const cpfBusca = busca.replace(/\D/g, '');
            let whereClause = 'WHERE nome ILIKE $1';
            let params = [termoBuscaNome];
            if (cpfBusca) {
                whereClause += ' OR cpf LIKE $2';
                params.push(`%${cpfBusca}%`);
            }
            const countResult = await db_1.default.query(`SELECT COUNT(*) FROM clientes ${whereClause}`, params);
            totalClientes = parseInt(countResult.rows[0].count, 10);
            const limitOffsetPlaceholders = `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            const dataResult = await db_1.default.query(`SELECT id, nome, cpf FROM clientes ${whereClause} ORDER BY nome ASC ${limitOffsetPlaceholders}`, [...params, limit, offset]);
            clientes = dataResult.rows;
        }
        else {
            const countResult = await db_1.default.query('SELECT COUNT(*) FROM clientes');
            totalClientes = parseInt(countResult.rows[0].count, 10);
            const dataResult = await db_1.default.query('SELECT id, nome, cpf FROM clientes ORDER BY nome ASC LIMIT $1 OFFSET $2', [limit, offset]);
            clientes = dataResult.rows;
        }
        res.status(200).json({
            clientes,
            total: totalClientes,
            paginaAtual: parseInt(page, 10),
            totalPaginas: Math.ceil(totalClientes / limit),
        });
    }
    catch (error) {
        console.error('Erro ao listar clientes:', error);
        res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
});
// GET /clientes/:cpf - Consultar saldo de pontos
router.get('/:cpf', async (req, res) => {
    try {
        const cpfParam = req.params.cpf.replace(/\D/g, '');
        if (!cpfParam || cpfParam.length !== 11) {
            return res.status(400).json({ error: 'Formato de CPF inválido.' });
        }
        const clienteResult = await db_1.default.query('SELECT id, nome, cpf FROM clientes WHERE cpf = $1', [cpfParam]);
        const cliente = clienteResult.rows[0];
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        const clienteId = cliente.id;
        const creditosResult = await db_1.default.query(`SELECT COALESCE(SUM(pontos_restantes), 0) as total FROM transacoes WHERE cliente_id = $1 AND data_liberacao <= NOW() AND data_vencimento > NOW()`, [clienteId]);
        const pontosDisponiveis = parseInt(creditosResult.rows[0].total);
        const pontosPendentesResult = await db_1.default.query(`SELECT COALESCE(SUM(pontos_restantes), 0) as total FROM transacoes WHERE cliente_id = $1 AND data_liberacao > NOW()`, [clienteId]);
        const pontosPendentes = parseInt(pontosPendentesResult.rows[0].total);
        const proximoVencimentoResult = await db_1.default.query(`SELECT MIN(data_vencimento) as proximo_vencimento FROM transacoes WHERE cliente_id = $1 AND data_vencimento > NOW() AND data_liberacao <= NOW() AND pontos_restantes > 0`, [clienteId]);
        const proximoVencimento = proximoVencimentoResult.rows[0].proximo_vencimento;
        const expiracaoUrgenteResult = await db_1.default.query(`SELECT COALESCE(SUM(pontos_restantes), 0) as pontos_expirando, MIN(data_vencimento) as data_proxima_expiracao FROM transacoes WHERE cliente_id = $1 AND data_liberacao <= NOW() AND data_vencimento > NOW() AND data_vencimento <= NOW() + INTERVAL '7 days' AND pontos_restantes > 0`, [clienteId]);
        const pontosExpirando = parseInt(expiracaoUrgenteResult.rows[0].pontos_expirando, 10) || 0;
        const dataProximaExpiracao = expiracaoUrgenteResult.rows[0].data_proxima_expiracao;
        const liberacaoUrgenteResult = await db_1.default.query(`SELECT MIN(data_liberacao) as data_proxima_liberacao FROM transacoes WHERE cliente_id = $1 AND data_liberacao > NOW() AND pontos_restantes > 0`, [clienteId]);
        const dataProximaLiberacao = liberacaoUrgenteResult.rows[0].data_proxima_liberacao;
        res.status(200).json({
            nome: cliente.nome,
            cpf: cliente.cpf,
            pontosDisponiveis,
            pontosPendentes,
            proximoVencimento,
            pontosExpirando,
            dataProximaExpiracao,
            dataProximaLiberacao,
        });
    }
    catch (error) {
        console.error('Erro ao consultar cliente:', error);
        res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
});
// GET /clientes/:cpf/extrato - Extrato de transações
router.get('/:cpf/extrato', async (req, res) => {
    try {
        const cpfParam = req.params.cpf.replace(/\D/g, '');
        if (!cpfParam || cpfParam.length !== 11) {
            return res.status(400).json({ error: 'Formato de CPF inválido.' });
        }
        const clienteResult = await db_1.default.query('SELECT id FROM clientes WHERE cpf = $1', [cpfParam]);
        const cliente = clienteResult.rows[0];
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        const clienteId = cliente.id;
        const limit = parseInt(req.query.limit || '100', 10);
        const combinedQuery = `
      SELECT * FROM (
        SELECT 'credito' as tipo, pontos_ganhos as pontos, data_transacao as data, 'Pontos por compra' as descricao 
        FROM transacoes WHERE cliente_id = $1
        UNION ALL
        SELECT 'debito' as tipo, res.pontos_gastos as pontos, res.data_resgate as data, rec.nome as descricao 
        FROM resgates res JOIN recompensas rec ON res.recompensa_id = rec.id WHERE res.cliente_id = $1
      ) as extrato_unificado
      ORDER BY data DESC
      LIMIT $2
    `;
        const extratoResult = await db_1.default.query(combinedQuery, [clienteId, limit]);
        res.status(200).json(extratoResult.rows);
    }
    catch (error) {
        console.error('Erro ao buscar extrato do cliente:', error);
        res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
});
// POST /clientes/cadastro - Cadastrar novo cliente
router.post('/cadastro', async (req, res) => {
    const { nome, cpf, lgpd_consentimento } = req.body;
    if (!nome || !cpf) {
        return res.status(400).json({ error: 'Nome e CPF são obrigatórios.' });
    }
    if (lgpd_consentimento !== true) {
        return res.status(400).json({ error: 'É necessário aceitar os termos de uso e a política de privacidade.' });
    }
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (!cpf_cnpj_validator_1.cpf.isValid(cpfLimpo)) {
        return res.status(400).json({ error: 'O CPF informado é inválido.' });
    }
    const client = await db_1.default.connect();
    try {
        await client.query('BEGIN');
        const existingClientResult = await client.query('SELECT * FROM clientes WHERE cpf = $1', [cpfLimpo]);
        const existingClient = existingClientResult.rows[0];
        let finalClient;
        if (existingClient) {
            if (existingClient.nome) {
                await client.query('ROLLBACK');
                return res.status(409).json({ error: 'Este CPF já está cadastrado em nosso sistema.' });
            }
            else {
                const updatedClientResult = await client.query(`UPDATE clientes 
           SET nome = $1, lgpd_consentimento = $2, data_consentimento = $3 
           WHERE cpf = $4 
           RETURNING id, nome, cpf`, [nome, lgpd_consentimento, new Date(), cpfLimpo]);
                finalClient = updatedClientResult.rows[0];
            }
        }
        else {
            const newClientResult = await client.query(`INSERT INTO clientes (nome, cpf, lgpd_consentimento, data_consentimento) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, nome, cpf`, [nome, cpfLimpo, lgpd_consentimento, new Date()]);
            finalClient = newClientResult.rows[0];
        }
        await client.query('COMMIT');
        res.status(201).json({
            message: 'Cadastro realizado com sucesso!',
            cliente: finalClient,
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao cadastrar cliente:', error);
        res.status(500).json({ error: 'Ocorreu um erro no servidor ao realizar o cadastro.' });
    }
    finally {
        if (client)
            client.release();
    }
});
exports.default = router;
