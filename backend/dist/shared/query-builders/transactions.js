"use strict";
/**
 * Query Builders para operações frequentes
 * Centraliza queries duplicadas e facilita manutenção
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUERY_RELEASING_SOON_POINTS_BY_TENANT = exports.QUERY_RELEASING_SOON_POINTS = exports.QUERY_EXPIRING_SOON_POINTS_BY_TENANT = exports.QUERY_EXPIRING_SOON_POINTS = exports.QUERY_NEXT_EXPIRATION_DATE_BY_TENANT = exports.QUERY_NEXT_EXPIRATION_DATE = exports.QUERY_SUM_PENDING_POINTS_BY_TENANT = exports.QUERY_SUM_PENDING_POINTS = exports.QUERY_SUM_AVAILABLE_POINTS_BY_TENANT = exports.QUERY_SUM_AVAILABLE_POINTS = exports.QUERY_SELECT_CUSTOMER_BY_DOCUMENT_AND_TENANT = exports.QUERY_SELECT_CUSTOMER_BY_DOCUMENT = void 0;
/**
 * Query: Buscar cliente por CPF
 * Usado em: transacoes.routes.ts, resgates.routes.ts, clientes.routes.ts cadastro
 */
const QUERY_SELECT_CUSTOMER_BY_DOCUMENT = (includeSoftDelete = true) => {
    const whereClause = includeSoftDelete
        ? 'WHERE c.deleted_at IS NULL AND COALESCE(cp.document, c.document) = $1'
        : 'WHERE COALESCE(cp.document, c.document) = $1';
    return `
    SELECT c.id
    FROM customers c
    LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
    ${whereClause}
  `;
};
exports.QUERY_SELECT_CUSTOMER_BY_DOCUMENT = QUERY_SELECT_CUSTOMER_BY_DOCUMENT;
/**
 * Query: Buscar cliente por CPF + tenant_id
 * Usado em: transacoes.routes.ts, resgates.routes.ts
 */
const QUERY_SELECT_CUSTOMER_BY_DOCUMENT_AND_TENANT = (includeSoftDelete = true) => {
    const whereClause = includeSoftDelete
        ? 'WHERE c.tenant_id = $2 AND c.deleted_at IS NULL AND COALESCE(cp.document, c.document) = $1'
        : 'WHERE c.tenant_id = $2 AND COALESCE(cp.document, c.document) = $1';
    return `
    SELECT c.id
    FROM customers c
    LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
    ${whereClause}
  `;
};
exports.QUERY_SELECT_CUSTOMER_BY_DOCUMENT_AND_TENANT = QUERY_SELECT_CUSTOMER_BY_DOCUMENT_AND_TENANT;
/**
 * Query: Somar pontos disponíveis de um cliente
 * Usado em: clientes.routes.ts, dashboard.routes.ts, public.routes.ts
 */
const QUERY_SUM_AVAILABLE_POINTS = () => {
    return `
    SELECT COALESCE(SUM(remaining_points), 0) as total 
    FROM transactions 
    WHERE customer_id = $1 
      AND available_at <= NOW() 
      AND expires_at > NOW()
  `;
};
exports.QUERY_SUM_AVAILABLE_POINTS = QUERY_SUM_AVAILABLE_POINTS;
/**
 * Query: Somar pontos disponíveis de um cliente + tenant
 */
const QUERY_SUM_AVAILABLE_POINTS_BY_TENANT = () => {
    return `
    SELECT COALESCE(SUM(remaining_points), 0) as total 
    FROM transactions 
    WHERE customer_id = $1 
      AND tenant_id = $2
      AND available_at <= NOW() 
      AND expires_at > NOW()
  `;
};
exports.QUERY_SUM_AVAILABLE_POINTS_BY_TENANT = QUERY_SUM_AVAILABLE_POINTS_BY_TENANT;
/**
 * Query: Somar pontos pendentes (não liberados ainda)
 * Usado em: clientes.routes.ts
 */
const QUERY_SUM_PENDING_POINTS = () => {
    return `
    SELECT COALESCE(SUM(remaining_points), 0) as total 
    FROM transactions 
    WHERE customer_id = $1 
      AND available_at > NOW()
  `;
};
exports.QUERY_SUM_PENDING_POINTS = QUERY_SUM_PENDING_POINTS;
/**
 * Query: Somar pontos pendentes + tenant
 */
const QUERY_SUM_PENDING_POINTS_BY_TENANT = () => {
    return `
    SELECT COALESCE(SUM(remaining_points), 0) as total 
    FROM transactions 
    WHERE customer_id = $1 
      AND tenant_id = $2
      AND available_at > NOW()
  `;
};
exports.QUERY_SUM_PENDING_POINTS_BY_TENANT = QUERY_SUM_PENDING_POINTS_BY_TENANT;
/**
 * Query: Próximo vencimento de pontos disponíveis
 * Usado em: clientes.routes.ts
 */
const QUERY_NEXT_EXPIRATION_DATE = () => {
    return `
    SELECT MIN(expires_at) as proximo_vencimento 
    FROM transactions 
    WHERE customer_id = $1 
      AND expires_at > NOW() 
      AND available_at <= NOW() 
      AND remaining_points > 0
  `;
};
exports.QUERY_NEXT_EXPIRATION_DATE = QUERY_NEXT_EXPIRATION_DATE;
/**
 * Query: Próximo vencimento + tenant
 */
const QUERY_NEXT_EXPIRATION_DATE_BY_TENANT = () => {
    return `
    SELECT MIN(expires_at) as proximo_vencimento 
    FROM transactions 
    WHERE customer_id = $1 
      AND tenant_id = $2
      AND expires_at > NOW() 
      AND available_at <= NOW() 
      AND remaining_points > 0
  `;
};
exports.QUERY_NEXT_EXPIRATION_DATE_BY_TENANT = QUERY_NEXT_EXPIRATION_DATE_BY_TENANT;
/**
 * Query: Pontos expirando nos próximos 7 dias
 * Usado em: clientes.routes.ts
 */
const QUERY_EXPIRING_SOON_POINTS = () => {
    return `
    SELECT 
      COALESCE(SUM(remaining_points), 0) as pontos_expirando, 
      MIN(expires_at) as data_proxima_expiracao 
    FROM transactions 
    WHERE customer_id = $1 
      AND available_at <= NOW() 
      AND expires_at > NOW() 
      AND expires_at <= NOW() + INTERVAL '7 days' 
      AND remaining_points > 0
  `;
};
exports.QUERY_EXPIRING_SOON_POINTS = QUERY_EXPIRING_SOON_POINTS;
/**
 * Query: Pontos expirando + tenant
 */
const QUERY_EXPIRING_SOON_POINTS_BY_TENANT = () => {
    return `
    SELECT 
      COALESCE(SUM(remaining_points), 0) as pontos_expirando, 
      MIN(expires_at) as data_proxima_expiracao 
    FROM transactions 
    WHERE customer_id = $1 
      AND tenant_id = $2
      AND available_at <= NOW() 
      AND expires_at > NOW() 
      AND expires_at <= NOW() + INTERVAL '7 days' 
      AND remaining_points > 0
  `;
};
exports.QUERY_EXPIRING_SOON_POINTS_BY_TENANT = QUERY_EXPIRING_SOON_POINTS_BY_TENANT;
/**
 * Query: Acesso liberado nos próximos 7 dias
 * Usado em: clientes.routes.ts
 */
const QUERY_RELEASING_SOON_POINTS = () => {
    return `
    SELECT 
      COALESCE(SUM(remaining_points), 0) as pontos_liberando, 
      MIN(available_at) as data_proxima_liberacao 
    FROM transactions 
    WHERE customer_id = $1 
      AND available_at > NOW() 
      AND available_at <= NOW() + INTERVAL '7 days'
  `;
};
exports.QUERY_RELEASING_SOON_POINTS = QUERY_RELEASING_SOON_POINTS;
/**
 * Query: Acesso liberado + tenant
 */
const QUERY_RELEASING_SOON_POINTS_BY_TENANT = () => {
    return `
    SELECT 
      COALESCE(SUM(remaining_points), 0) as pontos_liberando, 
      MIN(available_at) as data_proxima_liberacao 
    FROM transactions 
    WHERE customer_id = $1 
      AND tenant_id = $2
      AND available_at > NOW() 
      AND available_at <= NOW() + INTERVAL '7 days'
  `;
};
exports.QUERY_RELEASING_SOON_POINTS_BY_TENANT = QUERY_RELEASING_SOON_POINTS_BY_TENANT;
