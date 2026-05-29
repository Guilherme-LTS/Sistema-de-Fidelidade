"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAdmin = ensureAdmin;
exports.requireTenantId = requireTenantId;
const request_context_1 = require("../../shared/request-context");
function ensureAdmin(authReq, res, message = 'Acesso negado.') {
    if (authReq.usuario?.role !== 'admin') {
        res.status(403).json({ error: message });
        return false;
    }
    return true;
}
function requireTenantId(authReq, res) {
    const tenantId = (0, request_context_1.getTenantId)(authReq);
    if (!tenantId) {
        res.status(400).json({ error: request_context_1.TENANT_NOT_FOUND_ERROR });
        return null;
    }
    return tenantId;
}
