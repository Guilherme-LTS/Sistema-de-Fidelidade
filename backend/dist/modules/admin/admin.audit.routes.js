"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const autenticacao_1 = __importDefault(require("../../shared/middlewares/autenticacao"));
const audit_queries_1 = require("../../shared/auditoria/audit-queries");
const admin_guard_1 = require("./admin.guard");
const router = (0, express_1.Router)();
router.get('/auditoria', autenticacao_1.default, async (req, res) => {
    const authReq = req;
    if (!(0, admin_guard_1.ensureAdmin)(authReq, res, 'Acesso negado. Apenas administradores.')) {
        return;
    }
    const tenantId = (0, admin_guard_1.requireTenantId)(authReq, res);
    if (!tenantId) {
        return;
    }
    const { page = 1, limit = 50, q = '', startDate, endDate, eventType = '', status = '' } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;
    const searchText = String(q || '').trim();
    const eventTypeFilter = String(eventType || '').trim();
    const statusFilter = String(status || '').trim().toUpperCase();
    const parsedStartDate = startDate ? new Date(String(startDate)) : null;
    const parsedEndDate = endDate ? new Date(String(endDate)) : null;
    if (parsedStartDate && Number.isNaN(parsedStartDate.getTime())) {
        return res.status(400).json({ error: 'startDate inválida.' });
    }
    if (parsedEndDate && Number.isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ error: 'endDate inválida.' });
    }
    try {
        const report = await (0, audit_queries_1.fetchAuditReport)(authReq, tenantId, {
            searchText,
            eventType: eventTypeFilter,
            status: statusFilter,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
        }, {
            page: safePage,
            limit: safeLimit,
        });
        return res.status(200).json(report);
    }
    catch (error) {
        console.error('Erro ao buscar auditoria:', error);
        return res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
});
exports.default = router;
