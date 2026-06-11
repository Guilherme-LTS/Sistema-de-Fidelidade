import { Request } from 'express';
import { PoolClient } from 'pg';
import pool from './db';

/**
 * Interface que representa os dados retornados no JWT do Auth do Supabase.
 * Precisaremos injetar o 'tenant_id' nos metadados da sessão para o RLS.
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;           // auth.users.id
    tenant_id: string;    // O ID do restaurante atrelado ao usuário
    role: string;         // Operador ou Admin
  };
  // Compatibilidade com código legado
  usuario?: {
    id: string;           // UUID do tenant_users
    user_id: string;      // UUID do Supabase Auth
    nome: string;
    email: string;
    role: string;         // Operador ou Admin
    tenant_id: string;    // O ID do tenant atrelado ao usuário
  };
}

/**
 * Sanitiza string JSON para uso seguro em SET LOCAL (evita SQL injection)
 */
function sanitizeJsonForSQL(jsonStr: string): string {
  // Escapa aspas simples (método padrão PostgreSQL)
  return jsonStr.replace(/'/g, "''");
}

export const setRlsClaims = async (client: PoolClient, req: AuthenticatedRequest) => {
  const tenantId = req.user?.tenant_id || req.usuario?.tenant_id || null;
  const userId = req.user?.id || req.usuario?.id || null;
  const role = req.user?.role || req.usuario?.role || 'authenticated';

  const jwtClaims = JSON.stringify({
    sub: userId,
    tenant_id: tenantId,
    role: role,
    // Adicionamos campos extras que o Supabase costuma esperar
    email: req.usuario?.email || '',
    app_metadata: { provider: 'email' },
    user_metadata: { name: req.usuario?.nome || '' }
  });

  const sanitizedClaims = sanitizeJsonForSQL(jwtClaims);
  
  try {
    // 1. Configuramos as claims do JWT
    await client.query(`SET LOCAL request.jwt.claims = '${sanitizedClaims}'`);
    
    // 3. Configuramos especificamente o tenant_id em uma variável separada se necessário por alguma policy customizada
    if (tenantId) {
      await client.query(`SET LOCAL app.current_tenant = '${tenantId}'`);
    }
  } catch (err: any) {
    console.error('Erro ao configurar claims de RLS:', err.message);
    throw err;
  }
};

export const resetRlsClaims = async (client: PoolClient) => {
  await client.query('RESET request.jwt.claims');
};

export const withRlsTransaction = async <T>(
  req: AuthenticatedRequest,
  handler: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await setRlsClaims(client, req);

    const result = await handler(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await resetRlsClaims(client).catch(() => {});
    client.release();
  }
};

/**
 * Wrapper de Transação para o PostgreSQL via node-pg.
 * Ele força o Banco de Dados a assumir as características do JWT por sessão,
 * fazendo com que a Row Level Security (RLS) no Supabase bloqueie os dados 
 * dos outros tenants antes mesmo da cláusula WHERE.
 * 
 * Por que precisamos disso?
 * R: O Supabase Postgres usa RLS no nível do Supabase Auth.
 * Quando conectamos pelo Pool puro (usuário db_postgres), nós ignoramos o RLS.
 * Com esse Wrapper, usamos "SET LOCAL request.jwt.claims", mentindo pro 
 * Postgres que somos um JWT validado com as claims certas.
 */
export const queryWithRLS = async (req: AuthenticatedRequest, queryStr: string, params: any[] = []) => {
  const client = await pool.connect();

  try {
    // 1. Iniciar Transação
    await client.query('BEGIN');

    // 2. Montar as claims seguras para injeção (Garante que se não houver tenant_id, não vaza dados)
    const jwtClaims = JSON.stringify({
      sub: req.user?.id || req.usuario?.id || null,     // Subject
      tenant_id: req.user?.tenant_id || req.usuario?.tenant_id || null, // O metadado Custom (Isolador Multi-tenant)
      role: req.user?.role || req.usuario?.role || 'anon' // Papel no sistema
    });

    // 3. Forçar as claims na sessão atual da conexão. Configura RLS!
    // SEGURO: Escapamos a string JSON para evitar SQL injection via aspas
    const sanitizedClaims = sanitizeJsonForSQL(jwtClaims);
    await client.query(`SET LOCAL request.jwt.claims = '${sanitizedClaims}'`);

    // 4. Executar a query verdadeira e limpa (ex: "SELECT * FROM customers")
    const result = await client.query(queryStr, params);

    // 5. Finalizar 
    await client.query('COMMIT');
    
    return result;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Opcional de segurança para limpar contexto da conexão antes de voltar pro Pool
    await client.query("RESET request.jwt.claims").catch(() => {});
    client.release();
  }
};
