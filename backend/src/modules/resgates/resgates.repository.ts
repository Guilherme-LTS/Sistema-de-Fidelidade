import { PoolClient } from 'pg';
import { Request } from 'express';
import { logAuditEvent } from '../../shared/auditoria/audit';
import { resolveTenantCustomerByDocument } from '../../shared/customers/customer-identity';
import { FifoDebitUpdate, buildFifoUpdateQuery } from '../../shared/pontos/pontos-service';

export class ResgatesRepository {
  constructor(private readonly client: PoolClient) {}

  async findCustomerByDocument(tenantId: string, document: string) {
    return resolveTenantCustomerByDocument(this.client, tenantId, document);
  }

  async findActiveReward(tenantId: string, rewardId: string) {
    const result = await this.client.query(
      'SELECT points_cost, name FROM rewards WHERE id = $1 AND tenant_id = $2 AND is_active = true',
      [rewardId, tenantId],
    );

    return result.rows[0] || null;
  }

  async lockAvailableTransactions(customerId: string, tenantId: string) {
    const result = await this.client.query(
      `
        SELECT id, remaining_points
        FROM transactions
        WHERE customer_id = $1
          AND tenant_id = $2
          AND remaining_points > 0
          AND available_at <= NOW()
          AND expires_at > NOW()
        ORDER BY expires_at ASC, created_at ASC
        FOR UPDATE
      `,
      [customerId, tenantId],
    );

    return result.rows;
  }

  async applyFifoDebits(updates: FifoDebitUpdate[], tenantId: string) {
    if (updates.length === 0) {
      return;
    }

    const { ids, caseClause } = buildFifoUpdateQuery(updates);
    await this.client.query(
      `UPDATE transactions SET remaining_points = ${caseClause} WHERE id = ANY($1) AND tenant_id = $2`,
      [ids, tenantId],
    );
  }

  async createRedemption(input: {
    customerId: string;
    rewardId: string;
    pointsSpent: number;
    operatorId?: string | null;
    tenantId: string;
  }) {
    const result = await this.client.query(
      'INSERT INTO redemptions (customer_id, reward_id, points_spent, operator_id, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [input.customerId, input.rewardId, input.pointsSpent, input.operatorId, input.tenantId],
    );

    return result.rows[0];
  }

  async logRewardRedeemed(input: {
    req: Request;
    tenantId: string;
    operatorId?: string | null;
    rewardId: string;
    rewardName?: string | null;
    document: string;
    pointsSpent: number;
    redemptionId?: string | number;
  }) {
    return logAuditEvent({
      req: input.req,
      client: this.client,
      tenantId: input.tenantId,
      operatorId: input.operatorId || null,
      action: 'RESGATE_RECOMPENSA',
      details: `Resgate de recompensa ${input.rewardName || input.rewardId} para CPF ${input.document}, consumindo ${input.pointsSpent} pontos.`,
      targetLabel: input.rewardName || `Recompensa #${input.rewardId}`,
      impactLabel: `-${input.pointsSpent} pts`,
      status: 'SUCESSO',
      entityType: 'redemption',
      entityId: input.redemptionId,
    });
  }
}
