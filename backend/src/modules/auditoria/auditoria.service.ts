import { db } from "../../infra/database/db.js";
import { auditLogs, tenantUsers } from "../../infra/database/schema.js";
import { eq, and, desc, asc, ilike, or, gte, lte, sql } from "drizzle-orm";

type ListQueryParams = {
  page: number;
  limit: number;
  action?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  q?: string;
};

export class AuditoriaService {
  async listLogs(tenantId: string, params: ListQueryParams) {
    const offset = (params.page - 1) * params.limit;
    
    const whereConditions = [];
    whereConditions.push(eq(auditLogs.tenantId, tenantId));

    if (params.action && params.action !== 'ALL') {
      whereConditions.push(eq(auditLogs.action, params.action));
    }
    
    if (params.status && params.status !== 'ALL') {
      whereConditions.push(eq(auditLogs.status, params.status));
    }

    if (params.startDate) {
      whereConditions.push(gte(auditLogs.createdAt, params.startDate));
    }

    if (params.endDate) {
      whereConditions.push(lte(auditLogs.createdAt, params.endDate));
    }

    if (params.q) {
      const qText = `%${params.q}%`;
      whereConditions.push(
        or(
          ilike(auditLogs.entityType, qText),
          ilike(auditLogs.metadata, qText),
          ilike(auditLogs.action, qText)
        )
      );
    }

    const conditions = and(...whereConditions);

    const [countResult] = await db.select({ count: sql<number>`cast(count(${auditLogs.id}) as integer)` })
      .from(auditLogs)
      .where(conditions);
      
    const total = countResult.count || 0;

    const logs = await db.select({
      id: auditLogs.id,
      tenant_id: auditLogs.tenantId,
      operator_id: auditLogs.operatorId,
      action: auditLogs.action,
      entity_type: auditLogs.entityType,
      entity_id: auditLogs.entityId,
      metadata: auditLogs.metadata,
      status: auditLogs.status,
      ip_address: auditLogs.ipAddress,
      created_at: auditLogs.createdAt,
      operator: {
        name: sql<string>`coalesce(users.raw_user_meta_data->>'name', ${tenantUsers.name})`,
        email: sql<string>`users.email`,
      }
    })
    .from(auditLogs)
    .leftJoin(sql`auth.users`, sql`auth.users.id = ${auditLogs.operatorId}`)
    .leftJoin(tenantUsers, sql`${tenantUsers.userId} = ${auditLogs.operatorId} AND ${tenantUsers.tenantId} = ${auditLogs.tenantId}`)
    .where(conditions)
    .orderBy(desc(auditLogs.createdAt))
    .limit(params.limit)
    .offset(offset);

    return {
      data: logs,
      metadata: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      }
    };
  }
}

export const auditoriaService = new AuditoriaService();
