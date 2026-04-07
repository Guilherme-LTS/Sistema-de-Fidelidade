import { Request } from 'express';
import pool from './db';

/**
 * Interface que representa os dados retornados no JWT do Auth do Supabase.
 * Precisaremos injetar o 'tenant_id' nos metadados da sessão para o RLS.
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;           -- auth.users.id
    tenant_id: string;    -- O ID do restaurante atrelado ao usuário
    role: string;         -- Operador ou Admin
  };
}

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
      sub: req.user?.id || null,     // Subject
      tenant_id: req.user?.tenant_id || null, // O metadado Custom (Isolador Multi-tenant)
      role: req.user?.role || 'anon' // Papel no sistema
    });

    // 3. Forçar as claims na sessão atual da conexão. Configura RLS!
    await client.query(`SET LOCAL request.jwt.claims = '${jwtClaims}'`);

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
