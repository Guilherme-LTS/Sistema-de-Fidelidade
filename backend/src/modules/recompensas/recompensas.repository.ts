import { Request } from 'express';
import { PoolClient } from 'pg';
import { AuthenticatedRequest, queryWithRLS } from '../../infra/database/db-rls';
import { logAuditEvent } from '../../shared/auditoria/audit';

export class RecompensasRepository {
  constructor(
    private readonly authReq: AuthenticatedRequest,
    private readonly client?: PoolClient,
  ) {}

  private query(queryStr: string, params: any[] = []) {
    if (this.client) {
      return this.client.query(queryStr, params);
    }

    return queryWithRLS(this.authReq, queryStr, params);
  }

  async listActive(tenantId: string) {
    const result = await this.query(
      'SELECT * FROM rewards WHERE tenant_id = $1 AND is_active = true ORDER BY points_cost ASC',
      [tenantId],
    );

    return result.rows;
  }

  async listPublic(tenantId: string) {
    const result = await this.query(
      'SELECT id, name, description, points_cost FROM rewards WHERE tenant_id = $1 AND is_active = true ORDER BY points_cost ASC',
      [tenantId],
    );

    return result.rows;
  }

  async create(input: { name: string; description?: string | null; pointsCost: number; tenantId: string }) {
    const result = await this.query(
      'INSERT INTO rewards (name, description, points_cost, tenant_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [input.name, input.description, input.pointsCost, input.tenantId],
    );

    return result.rows[0];
  }

  async update(input: { id: string; name: string; description?: string | null; pointsCost: number; tenantId: string }) {
    const result = await this.query(
      'UPDATE rewards SET name = $1, description = $2, points_cost = $3 WHERE id = $4 AND tenant_id = $5 RETURNING *',
      [input.name, input.description, input.pointsCost, input.id, input.tenantId],
    );

    return result.rows[0] || null;
  }

  async deactivate(input: { id: string; tenantId: string }) {
    const result = await this.query(
      'UPDATE rewards SET is_active = false WHERE id = $1 AND tenant_id = $2 RETURNING *',
      [input.id, input.tenantId],
    );

    return result.rows[0] || null;
  }

  async logRewardEvent(input: {
    req: Request;
    tenantId: string;
    operatorId?: string | null;
    action: 'CRIACAO_RECOMPENSA' | 'EDICAO_RECOMPENSA' | 'DESATIVACAO_RECOMPENSA';
    details: string;
    targetLabel: string;
    impactLabel: string;
    rewardId?: string | number;
  }) {
    return logAuditEvent({
      req: input.req,
      tenantId: input.tenantId,
      operatorId: input.operatorId || null,
      action: input.action,
      details: input.details,
      targetLabel: input.targetLabel,
      impactLabel: input.impactLabel,
      status: 'SUCESSO',
      entityType: 'reward',
      entityId: input.rewardId,
      client: this.client,
    });
  }
}
