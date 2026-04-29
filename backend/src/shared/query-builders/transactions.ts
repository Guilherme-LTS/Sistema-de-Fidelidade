/**
 * Query Builders para operações frequentes
 * Centraliza queries duplicadas e facilita manutenção
 */

/**
 * Query: Buscar cliente por CPF
 * Usado em: transacoes.routes.ts, resgates.routes.ts, clientes.routes.ts cadastro
 */
export const QUERY_SELECT_CUSTOMER_BY_DOCUMENT = (includeSoftDelete = true) => {
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

/**
 * Query: Buscar cliente por CPF + tenant_id
 * Usado em: transacoes.routes.ts, resgates.routes.ts
 */
export const QUERY_SELECT_CUSTOMER_BY_DOCUMENT_AND_TENANT = (includeSoftDelete = true) => {
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

/**
 * Query: Somar pontos disponíveis de um cliente
 * Usado em: clientes.routes.ts, dashboard.routes.ts, public.routes.ts
 */
export const QUERY_SUM_AVAILABLE_POINTS = () => {
  return `
    SELECT COALESCE(SUM(remaining_points), 0) as total 
    FROM transactions 
    WHERE customer_id = $1 
      AND available_at <= NOW() 
      AND expires_at > NOW()
  `;
};

/**
 * Query: Somar pontos disponíveis de um cliente + tenant
 */
export const QUERY_SUM_AVAILABLE_POINTS_BY_TENANT = () => {
  return `
    SELECT COALESCE(SUM(remaining_points), 0) as total 
    FROM transactions 
    WHERE customer_id = $1 
      AND tenant_id = $2
      AND available_at <= NOW() 
      AND expires_at > NOW()
  `;
};

/**
 * Query: Somar pontos pendentes (não liberados ainda)
 * Usado em: clientes.routes.ts
 */
export const QUERY_SUM_PENDING_POINTS = () => {
  return `
    SELECT COALESCE(SUM(remaining_points), 0) as total 
    FROM transactions 
    WHERE customer_id = $1 
      AND available_at > NOW()
  `;
};

/**
 * Query: Somar pontos pendentes + tenant
 */
export const QUERY_SUM_PENDING_POINTS_BY_TENANT = () => {
  return `
    SELECT COALESCE(SUM(remaining_points), 0) as total 
    FROM transactions 
    WHERE customer_id = $1 
      AND tenant_id = $2
      AND available_at > NOW()
  `;
};

/**
 * Query: Próximo vencimento de pontos disponíveis
 * Usado em: clientes.routes.ts
 */
export const QUERY_NEXT_EXPIRATION_DATE = () => {
  return `
    SELECT MIN(expires_at) as proximo_vencimento 
    FROM transactions 
    WHERE customer_id = $1 
      AND expires_at > NOW() 
      AND available_at <= NOW() 
      AND remaining_points > 0
  `;
};

/**
 * Query: Próximo vencimento + tenant
 */
export const QUERY_NEXT_EXPIRATION_DATE_BY_TENANT = () => {
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

/**
 * Query: Pontos expirando nos próximos 7 dias
 * Usado em: clientes.routes.ts
 */
export const QUERY_EXPIRING_SOON_POINTS = () => {
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

/**
 * Query: Pontos expirando + tenant
 */
export const QUERY_EXPIRING_SOON_POINTS_BY_TENANT = () => {
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

/**
 * Query: Acesso liberado nos próximos 7 dias
 * Usado em: clientes.routes.ts
 */
export const QUERY_RELEASING_SOON_POINTS = () => {
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

/**
 * Query: Acesso liberado + tenant
 */
export const QUERY_RELEASING_SOON_POINTS_BY_TENANT = () => {
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
