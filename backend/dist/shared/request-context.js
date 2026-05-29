"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantId = exports.TENANT_NOT_FOUND_ERROR = void 0;
exports.TENANT_NOT_FOUND_ERROR = 'Tenant do usuário não identificado.';
const getTenantId = (req) => {
    return req.user?.tenant_id || req.usuario?.tenant_id || null;
};
exports.getTenantId = getTenantId;
