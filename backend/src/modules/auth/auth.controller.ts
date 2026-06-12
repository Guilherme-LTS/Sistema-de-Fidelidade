import { Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { adminPool } from '../../infra/database/db';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';

export function makeRegisterTenantController(supabaseAdmin: SupabaseClient) {
  return async function registerTenantController(req: Request, res: Response) {
    const { tenant_name, document, email, password, admin_name } = req.body;
    const client = await adminPool.connect();

    try {
      await client.query('BEGIN');
      const service = new AuthService(new AuthRepository(client, supabaseAdmin));
      const result = await service.registerTenant({
        tenantName: tenant_name,
        document,
        email,
        password,
        adminName: admin_name,
      });

      await client.query('COMMIT');
      return res.status(201).json(result);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  };
}
