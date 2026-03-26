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
// POST /transacoes - Lançar pontos (apenas admin)
router.post('/', autenticacao_1.default, async (req, res) => {
    if (req.usuario.role !== 'admin' && req.usuario.role !== 'operador') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores ou operadores podem lançar pontos.' });
    }
    const client = await db_1.default.connect();
    try {
        const { cpf, valor, nome } = req.body;
        if (!cpf || !valor || valor <= 0) {
            return res.status(400).json({ error: 'CPF e valor (maior que zero) são obrigatórios.' });
        }
        const cpfLimpo = cpf.replace(/\D/g, '');
        if (!cpf_cnpj_validator_1.cpf.isValid(cpfLimpo)) {
            return res.status(400).json({ error: 'CPF inválido.' });
        }
        const operadorId = req.usuario.id;
        const pontosGanhos = Math.floor(valor);
        // Buscar configurações dinamicamente do banco de dados
        const configResult = await client.query(`
      SELECT chave, valor FROM configuracoes 
      WHERE chave IN ('carencia_pontos', 'expiracao_pontos')
    `);
        // Fallback mapeado
        const configs = {
            carencia_pontos: 0,
            expiracao_pontos: 180
        };
        configResult.rows.forEach(row => {
            configs[row.chave] = row.valor;
        });
        const diasParaLiberacao = configs.carencia_pontos;
        const diasParaVencimento = configs.expiracao_pontos;
        const agora = new Date();
        // A data de liberação é agora + carência
        const data_liberacao = new Date(agora.getTime() + (diasParaLiberacao * 24 * 60 * 60 * 1000));
        // A data de vencimento é contada a partir da data de liberação + tempo de expiração validado
        const data_vencimento = new Date(data_liberacao.getTime() + (diasParaVencimento * 24 * 60 * 60 * 1000));
        await client.query('BEGIN');
        let resCliente = await client.query('SELECT id FROM clientes WHERE cpf = $1', [cpfLimpo]);
        let clienteId;
        if (!resCliente.rows[0]) {
            const resNovoCliente = await client.query('INSERT INTO clientes (cpf, nome, lgpd_consentimento) VALUES ($1, $2, false) RETURNING id', [cpfLimpo, nome]);
            clienteId = resNovoCliente.rows[0].id;
        }
        else {
            clienteId = resCliente.rows[0].id;
        }
        await client.query(`INSERT INTO transacoes (cliente_id, valor_gasto, pontos_ganhos, pontos_restantes, data_liberacao, data_vencimento, usuario_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [clienteId, valor, pontosGanhos, pontosGanhos, data_liberacao, data_vencimento, operadorId]);
        await client.query('COMMIT');
        res.status(201).json({ message: 'Transação registrada! Pontos ficarão disponíveis em breve.', pontosGanhos });
    }
    catch (error) {
        if (client)
            await client.query('ROLLBACK');
        console.error('Erro ao processar a transação:', error);
        res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
    finally {
        if (client)
            client.release();
    }
});
exports.default = router;
