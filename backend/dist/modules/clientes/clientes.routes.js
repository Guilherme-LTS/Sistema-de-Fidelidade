"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../../infra/database/db"));
const express_1 = require("express");
const autenticacao_1 = __importDefault(require("../../shared/middlewares/autenticacao"));
const cpf_1 = require("../../shared/validators/cpf");
const customer_identity_1 = require("../../shared/customers/customer-identity");
const request_context_1 = require("../../shared/request-context");
const customer_queries_1 = require("../../shared/customers/customer-queries");
const router = (0, express_1.Router)();
// GET /customers - Listar customers com busca e paginação
router.get('/', autenticacao_1.default, async (req, res) => {
    const { busca, page = '1', limit = '15' } = req.query;
    const authReq = req;
    const tenantId = (0, request_context_1.getTenantId)(authReq);
    if (!tenantId) {
        return res.status(400).json({ error: request_context_1.TENANT_NOT_FOUND_ERROR });
    }
    try {
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const { total, customers } = await (0, customer_queries_1.listCustomers)(authReq, {
            busca: busca,
            page: pageNum,
            limit: limitNum,
            tenantId,
        });
        res.status(200).json({
            customers,
            total,
            paginaAtual: pageNum,
            totalPaginas: Math.ceil(total / limitNum),
        });
    }
    catch (error) {
        console.error('Erro ao listar customers:', error);
        res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
});
// GET /customers/:document - Consultar saldo de pontos
router.get('/:document', autenticacao_1.default, async (req, res) => {
    try {
        const authReq = req;
        const tenantId = (0, request_context_1.getTenantId)(authReq);
        const cpfParam = req.params.document.replace(/\D/g, '');
        if (!tenantId) {
            return res.status(400).json({ error: request_context_1.TENANT_NOT_FOUND_ERROR });
        }
        if (!cpfParam || cpfParam.length !== 11) {
            return res.status(400).json({ error: 'Formato de CPF inválido.' });
        }
        const cliente = await (0, customer_queries_1.findCustomerByDocument)(authReq, tenantId, cpfParam);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        const clienteId = cliente.id;
        const summary = await (0, customer_queries_1.getCustomerFinancialSummary)(authReq, tenantId, clienteId);
        res.status(200).json({
            nome: cliente.name,
            document: cliente.document,
            ...summary,
        });
    }
    catch (error) {
        console.error('Erro ao consultar cliente:', error);
        res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
});
// GET /customers/:document/extrato - Extrato de transações
router.get('/:document/extrato', autenticacao_1.default, async (req, res) => {
    try {
        const authReq = req;
        const tenantId = (0, request_context_1.getTenantId)(authReq);
        const cpfParam = req.params.document.replace(/\D/g, '');
        if (!tenantId) {
            return res.status(400).json({ error: request_context_1.TENANT_NOT_FOUND_ERROR });
        }
        if (!cpfParam || cpfParam.length !== 11) {
            return res.status(400).json({ error: 'Formato de CPF inválido.' });
        }
        const cliente = await (0, customer_queries_1.findCustomerByDocument)(authReq, tenantId, cpfParam);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        const clienteId = cliente.id;
        const limit = parseInt(req.query.limit || '100', 10);
        const extrato = await (0, customer_queries_1.getCustomerStatement)(authReq, tenantId, clienteId, limit);
        res.status(200).json(extrato);
    }
    catch (error) {
        console.error('Erro ao buscar extrato do cliente:', error);
        res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
});
// POST /customers/cadastro - Cadastrar novo cliente (agora protegido)
router.post('/cadastro', autenticacao_1.default, async (req, res) => {
    const authReq = req;
    const { nome, document, lgpd_consentimento } = req.body;
    const tenantId = (0, request_context_1.getTenantId)(authReq);
    if (!nome || !document) {
        return res.status(400).json({ error: 'Nome e CPF são obrigatórios.' });
    }
    if (lgpd_consentimento !== true) {
        return res.status(400).json({ error: 'É necessário aceitar os termos de uso e a política de privacidade.' });
    }
    if (!tenantId) {
        return res.status(400).json({ error: request_context_1.TENANT_NOT_FOUND_ERROR });
    }
    const cpfValidation = (0, cpf_1.validateAndCleanCPF)(document);
    if (!cpfValidation.isValid) {
        return res.status(400).json({ error: cpfValidation.error });
    }
    const cpfLimpo = cpfValidation.cleaned;
    const client = await db_1.default.connect();
    try {
        await client.query('BEGIN');
        const finalClient = await (0, customer_identity_1.upsertTenantCustomerByDocument)(client, {
            tenantId,
            document: cpfLimpo,
            name: nome,
            lgpdConsent: lgpd_consentimento,
            consentDate: new Date(),
        });
        await client.query('COMMIT');
        res.status(201).json({
            message: 'Cadastro realizado com sucesso!',
            cliente: finalClient,
        });
    }
    catch (error) {
        await client.query('ROLLBACK').catch(() => { });
        console.error('Erro ao cadastrar cliente:', error);
        res.status(500).json({ error: 'Ocorreu um erro no servidor ao realizar o cadastro.' });
    }
    finally {
        client.release();
    }
});
exports.default = router;
