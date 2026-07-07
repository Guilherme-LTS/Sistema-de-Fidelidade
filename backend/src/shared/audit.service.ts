import { db } from '../infra/database/db.js';
import { auditLogs } from '../infra/database/schema.js';

export type AuditAction = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE_CUSTOMER'
  | 'UPDATE_CUSTOMER'
  | 'DELETE_CUSTOMER'
  | 'ADD_POINTS'
  | 'REDEEM_REWARD'
  | 'CREATE_REWARD'
  | 'UPDATE_REWARD'
  | 'DELETE_REWARD'
  | 'UPDATE_CONFIG'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'ACTIVATE_USER'
  | 'DEACTIVATE_USER'
  | 'DELETE_USER'
  | 'INVITE_USER'
  | 'LINK_GLOBAL_CUSTOMER'

export type AuditStatus = 'SUCESSO' | 'FALHA'

export interface LogAuditParams {
  tenantId: string
  operatorId?: string | null
  action: AuditAction
  entityType?: string
  entityId?: string
  metadata?: any
  status?: AuditStatus
  ipAddress?: string
}

export async function logAuditEvent(params: LogAuditParams) {
  try {
    await db.insert(auditLogs).values({
      tenantId: params.tenantId,
      operatorId: params.operatorId || null,
      action: params.action,
      entityType: params.entityType || null,
      entityId: params.entityId || null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      status: params.status || 'SUCESSO',
      ipAddress: params.ipAddress || null,
    });
    return { success: true };
  } catch (err) {
    console.error('[Audit Service] Falha ao registrar log de auditoria:', err);
    return { success: false, error: err };
  }
}
