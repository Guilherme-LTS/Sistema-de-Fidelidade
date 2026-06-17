import { PoolClient } from 'pg';
import { adminPool } from '../../infra/database/db';
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

  async createStaff(input: { tenantId: string; userId: string; nome: string; role: string }) {
    const result = await this.query(
      'INSERT INTO tenant_users (tenant_id, user_id, name, role, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id, user_id, name, role, is_active',
      [input.tenantId, input.userId, input.nome, input.role],
    );

    return result.rows[0];
  }

  async listStaff(tenantId: string) {
    const query = `
      SELECT u.id, u.user_id, u.name, u.role, u.is_active, (u.user_id = u.tenant_id) AS is_owner
      FROM tenant_users u
      WHERE u.tenant_id = $1
        AND u.deleted_at IS NULL
      ORDER BY u.name ASC
    `;
    const result = await this.query(query, [tenantId]);
    const users = result.rows;

    if (users.length === 0) {
      return users;
    }

    const emailResult = await adminPool.query(
      'SELECT id::text, email FROM auth.users WHERE id = ANY($1::uuid[])',
      [users.map((user) => user.user_id)],
    );
    const emailByUserId = new Map(emailResult.rows.map((row) => [row.id, row.email]));

    return users.map((user) => ({
      ...user,
      email: emailByUserId.get(user.user_id) || '',
    }));
  }

  async findStaffById(input: { id: string; tenantId: string }) {
    const result = await this.query(
      'SELECT id, user_id, role, (user_id = tenant_id) AS is_owner FROM tenant_users WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [input.id, input.tenantId],
    );

    return result.rows[0] || null;
  }

  async updateStaff(input: { id: string; tenantId: string; nome: string; role: string }) {
    const result = await this.query(
      'UPDATE tenant_users SET name = $1, role = $2, updated_at = NOW() WHERE id = $3 AND tenant_id = $4 AND deleted_at IS NULL RETURNING id, user_id',
      [input.nome, input.role, input.id, input.tenantId],
    );

    return result.rows[0] || null;
  }

  async updateStaffStatus(input: { id: string; tenantId: string; ativo: boolean }) {
    const result = await this.query(
      'UPDATE tenant_users SET is_active = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL RETURNING id, user_id',
      [input.ativo, input.id, input.tenantId],
    );

    return result.rows[0] || null;
  }

  async deleteStaff(input: { id: string; tenantId: string }) {
    const result = await this.query(
      'UPDATE tenant_users SET deleted_at = NOW(), is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id, user_id',
      [input.id, input.tenantId],
    );

    return result.rows[0] || null;
  }
}
