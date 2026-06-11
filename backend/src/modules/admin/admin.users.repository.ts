import { PoolClient } from 'pg';
import { AuthenticatedRequest, queryWithRLS } from '../../infra/database/db-rls';

export class AdminUsersRepository {
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

  async createStaff(input: { tenantId: string; nome: string; email?: string | null; role: string }) {
    const result = await this.query(
      'INSERT INTO tenant_staff (tenant_id, name, email, role, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id, name, email, role, is_active',
      [input.tenantId, input.nome, input.email || null, input.role],
    );

    return result.rows[0];
  }

  async listStaff(tenantId: string) {
    const query = `
      SELECT f.id, f.name, f.role, f.is_active, f.email
      FROM tenant_staff f
      WHERE f.tenant_id = $1
        AND f.deleted_at IS NULL
      ORDER BY f.id ASC
    `;
    const result = await this.query(query, [tenantId]);

    return result.rows;
  }

  async updateStaff(input: { id: string; tenantId: string; nome: string; role: string; email?: string | null }) {
    const result = await this.query(
      'UPDATE tenant_staff SET name = $1, role = $2, email = $3 WHERE id = $4 AND tenant_id = $5 AND deleted_at IS NULL RETURNING id',
      [input.nome, input.role, input.email || null, input.id, input.tenantId],
    );

    return result.rows[0] || null;
  }

  async updateStaffStatus(input: { id: string; tenantId: string; ativo: boolean }) {
    const result = await this.query(
      'UPDATE tenant_staff SET is_active = $1 WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL RETURNING id',
      [input.ativo, input.id, input.tenantId],
    );

    return result.rows[0] || null;
  }

  async deleteStaff(input: { id: string; tenantId: string }) {
    const result = await this.query(
      'UPDATE tenant_staff SET deleted_at = NOW(), is_active = false WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id',
      [input.id, input.tenantId],
    );

    return result.rows[0] || null;
  }
}
