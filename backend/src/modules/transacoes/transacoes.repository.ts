import { PoolClient } from 'pg';
import { Request } from 'express';
import { logAuditEvent } from '../../shared/auditoria/audit';
import { upsertTenantCustomerByDocument } from '../../shared/customers/customer-identity';
import { loadTenantPointSettings } from '../../shared/pontos/pontos-service';

export type TransactionCustomerInput = {
  tenantId: string;
  document: string;
  name?: string | null;
};

export type CreatePointsTransactionInput = {
  customerId: string;
  amountSpent: number;
  pointsEarned: number;
  availableAt: Date;
  expiresAt: Date;
  operatorId?: string | null;
  tenantId: string;
};

export class TransacoesRepository {
  constructor(private readonly client: PoolClient) {}

  async loadPointSettings(tenantId: string) {
    return loadTenantPointSettings(this.client, tenantId);
  }

  async withSavepoint(name: string, handler: () => Promise<void>) {
    await this.client.query(`SAVEPOINT ${name}`);
    try {
      await handler();
      await this.client.query(`RELEASE SAVEPOINT ${name}`);
    } catch (error) {
      await this.client.query(`ROLLBACK TO SAVEPOINT ${name}`).catch(() => {});
      throw error;
    }
  }

  async upsertCustomer(input: TransactionCustomerInput) {
    return upsertTenantCustomerByDocument(this.client, {
      tenantId: input.tenantId,
      document: input.document,
      name: input.name,
      lgpdConsent: false,
      consentDate: null,
    });
  }

  async createPointsTransaction(input: CreatePointsTransactionInput) {
    const result = await this.client.query(
      `
        INSERT INTO transactions (
          customer_id,
          amount_spent,
          points_earned,
          remaining_points,
          available_at,
          expires_at,
          operator_id,
          tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
      [
        input.customerId,
        input.amountSpent,
        input.pointsEarned,
        input.pointsEarned,
        input.availableAt,
        input.expiresAt,
        input.operatorId,
        input.tenantId,
      ],
    );

    return result.rows[0];
  }

  async logPointsCreated(input: {
    req: Request;
    tenantId: string;
    operatorId?: string | null;
    pointsEarned: number;
    amountSpent: number;
    document: string;
    targetLabel: string;
    transactionId?: string | number;
  }) {
    return logAuditEvent({
      req: input.req,
      client: this.client,
      tenantId: input.tenantId,
      operatorId: input.operatorId || null,
      action: 'LANCAMENTO_PONTOS',
      details: `Lancamento de ${input.pointsEarned} pontos para CPF ${input.document}. Valor da compra: R$ ${input.amountSpent.toFixed(2)}.`,
      targetLabel: input.targetLabel,
      impactLabel: `+${input.pointsEarned} pts`,
      status: 'SUCESSO',
      entityType: 'transaction',
      entityId: input.transactionId,
    });
  }
}
