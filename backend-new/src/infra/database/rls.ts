import { sql } from "drizzle-orm";
import { appDb } from "./db.js";

interface TenantContext {
  tenantId: string;
  authUserId?: string;
  role?: string;
}

/**
 * Executa uma transação injetando variáveis de contexto (request.jwt.claims)
 * na sessão do PostgreSQL para que as políticas de RLS funcionem corretamente.
 */
export async function withTenantTransaction<T>(
  tenantContext: TenantContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (tx: any) => Promise<T>
): Promise<T> {
  return await appDb.transaction(async (tx) => {
    // Montamos as claims no mesmo formato esperado pelo Supabase Auth/Postgres RLS
    const jwtClaims = JSON.stringify({
      sub: tenantContext.authUserId || null,
      tenant_id: tenantContext.tenantId,
      role: tenantContext.role || "authenticated",
    });

    // Usamos set_config parametrizado para total segurança contra SQL Injection
    await tx.execute(
      sql`SELECT set_config('request.jwt.claims', ${jwtClaims}, true)`
    );

    // Também definimos app.current_tenant para compatibilidade com políticas extras
    await tx.execute(
      sql`SELECT set_config('app.current_tenant', ${tenantContext.tenantId}, true)`
    );

    return await callback(tx);
  });
}
