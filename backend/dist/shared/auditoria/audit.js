"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestIp = getRequestIp;
exports.logAuditEvent = logAuditEvent;
const db_1 = __importDefault(require("../../infra/database/db"));
function getRequestIp(req) {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string' && xForwardedFor.trim()) {
        return xForwardedFor.split(',')[0].trim();
    }
    if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
        return xForwardedFor[0]?.split(',')[0].trim() || null;
    }
    return req.ip || req.socket?.remoteAddress || null;
}
async function logAuditEvent(input) {
    const { req, tenantId, action, details, status, targetLabel, impactLabel, operatorId, entityType, entityId, client } = input;
    const ipAddress = getRequestIp(req);
    const values = [
        tenantId,
        operatorId || null,
        action,
        details || null,
        status || 'SUCESSO',
        targetLabel || null,
        impactLabel || null,
        ipAddress,
        entityType || null,
        entityId ? String(entityId) : null
    ];
    const queryWithBusinessFields = `
    INSERT INTO audit_logs (
      tenant_id,
      operator_id,
      action,
      details,
      status,
      target_label,
      impact_label,
      ip_address,
      entity_type,
      entity_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `;
    const queryLegacy = `
    INSERT INTO audit_logs (tenant_id, operator_id, action, details, ip_address, entity_type, entity_id)
    VALUES ($1, $2, $3, $4, $8, $9, $10)
  `;
    try {
        if (client) {
            return await client.query(queryWithBusinessFields, values);
        }
        return await db_1.default.query(queryWithBusinessFields, values);
    }
    catch (error) {
        if (error?.code === '42703') {
            if (client) {
                return await client.query(queryLegacy, values);
            }
            return await db_1.default.query(queryLegacy, values);
        }
        // Tabela pode ainda nao existir em ambientes sem a migration aplicada.
        if (error?.code === '42P01') {
            console.warn('Tabela audit_logs nao encontrada. Evento de auditoria nao foi persistido.');
            return null;
        }
        throw error;
    }
}
