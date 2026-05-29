"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_rls_1 = require("../../infra/database/db-rls");
const autenticacao_1 = __importDefault(require("../../shared/middlewares/autenticacao"));
const audit_1 = require("../../shared/auditoria/audit");
const customer_identity_1 = require("../../shared/customers/customer-identity");
const request_context_1 = require("../../shared/request-context");
const pontos_service_1 = require("../../shared/pontos/pontos-service");
const router = (0, express_1.Router)();
class HttpError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
// POST /redemptions - Resgatar recompensa
router.post('/', autenticacao_1.default, async (req, res) => {
    try {
        const { document, recompensa_id } = req.body;
        const authReq = req;
        const operadorId = authReq.usuario?.id;
        const tenantId = (0, request_context_1.getTenantId)(authReq);
        const cpfLimpo = (document || '').replace(/\D/g, '');
        if (!cpfLimpo || !recompensa_id) {
            return res.status(400).json({ error: 'CPF e ID da recompensa são obrigatórios.' });
        }
        if (!tenantId) {
            return res.status(400).json({ error: request_context_1.TENANT_NOT_FOUND_ERROR });
        }
        const pontosRestantes = await (0, db_rls_1.withRlsTransaction)(authReq, async (client) => {
            const cliente = await (0, customer_identity_1.resolveTenantCustomerByDocument)(client, tenantId, cpfLimpo);
            if (!cliente)
                throw new HttpError(404, 'Cliente não encontrado.');
            const recompensaResult = await client.query('SELECT points_cost, name FROM rewards WHERE id = $1 AND tenant_id = $2 AND is_active = true', [recompensa_id, tenantId]);
            const recompensa = recompensaResult.rows[0];
            if (!recompensa)
                throw new HttpError(404, 'Recompensa não encontrada.');
            // 1. Busca transações válidas via FIFO (com lock para evitar race condition)
            const transacoesValidas = await client.query(`SELECT id, remaining_points FROM transactions
         WHERE customer_id = $1 AND tenant_id = $2 AND remaining_points > 0
         AND available_at <= NOW() AND expires_at > NOW()
         ORDER BY expires_at ASC, created_at ASC
         FOR UPDATE`, [cliente.id, tenantId]);
            const pontosDisponiveis = transacoesValidas.rows.reduce((acc, t) => acc + t.remaining_points, 0);
            if (pontosDisponiveis < recompensa.points_cost) {
                throw new HttpError(409, 'Pontos disponíveis insuficientes.');
            }
            const { updates } = (0, pontos_service_1.buildFifoDebitUpdates)(transacoesValidas.rows, recompensa.points_cost);
            // Executa um único UPDATE com CASE statement em vez de N queries
            if (updates.length > 0) {
                const { ids, caseClause } = (0, pontos_service_1.buildFifoUpdateQuery)(updates);
                await client.query(`UPDATE transactions SET remaining_points = ${caseClause} WHERE id = ANY($1) AND tenant_id = $2`, [ids, tenantId]);
            }
            // 3. Registra histórico do resgate
            const redemptionResult = await client.query('INSERT INTO redemptions (customer_id, reward_id, points_spent, operator_id, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id', [cliente.id, recompensa_id, recompensa.points_cost, operadorId, tenantId]);
            await (0, audit_1.logAuditEvent)({
                req,
                client,
                tenantId,
                operatorId: operadorId || null,
                action: 'RESGATE_RECOMPENSA',
                details: `Resgate de recompensa ${recompensa.name || recompensa_id} para CPF ${cpfLimpo}, consumindo ${recompensa.points_cost} pontos.`,
                targetLabel: recompensa.name || `Recompensa #${recompensa_id}`,
                impactLabel: `-${recompensa.points_cost} pts`,
                status: 'SUCESSO',
                entityType: 'redemption',
                entityId: redemptionResult.rows[0]?.id
            });
            return pontosDisponiveis - recompensa.points_cost;
        });
        res.status(200).json({ message: 'Recompensa resgatada com sucesso!', pontos_restantes: pontosRestantes });
    }
    catch (error) {
        console.error('Erro no resgate:', error);
        if (error instanceof HttpError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Ocorreu um erro no servidor.' });
    }
});
exports.default = router;
