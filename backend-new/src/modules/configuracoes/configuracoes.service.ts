import { eq, and } from "drizzle-orm";
import { db } from "../../infra/database/db.js";
import { tenants, tenantUsers } from "../../infra/database/schema.js";
import { AppError, NotFoundError } from "../../shared/errors/app-error.js";
import { logAuditEvent } from "../../shared/audit.service.js";

type RestauranteInput = {
  name: string;
  tradingName?: string;
  document?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressNumber?: string;
  addressCity?: string;
  addressState?: string;
  latitude?: string | number;
  longitude?: string | number;
  logoUrl?: string;
  businessHours?: Record<string, { active: boolean; open: string; close: string }>;
  socialLinks?: { instagram?: string; facebook?: string; tiktok?: string; website?: string };
};

type FidelidadeInput = {
  carenciaPontos: number;
  expiracaoPontos: number;
  // futuramente outras regras
};

export class ConfiguracoesService {
  async getRestaurante(tenantId: string) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });
    if (!tenant) throw new NotFoundError("Restaurante não encontrado.");
    
    // Ensure we always return an object even if it's null in DB
    const businessHours = tenant.businessHours || {
      monday: { active: false, open: "08:00", close: "18:00" },
      tuesday: { active: false, open: "08:00", close: "18:00" },
      wednesday: { active: false, open: "08:00", close: "18:00" },
      thursday: { active: false, open: "08:00", close: "18:00" },
      friday: { active: false, open: "08:00", close: "18:00" },
      saturday: { active: false, open: "08:00", close: "18:00" },
      sunday: { active: false, open: "08:00", close: "18:00" },
    };

    return { ...tenant, businessHours };
  }

  async updateRestaurante(tenantId: string, input: RestauranteInput, operatorId?: string, ipAddress?: string) {
    const [tenant] = await db.update(tenants)
      .set({
        ...input,
        latitude: input.latitude ? String(input.latitude) : undefined,
        longitude: input.longitude ? String(input.longitude) : undefined,
        businessHours: input.businessHours,
        socialLinks: input.socialLinks,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenants.id, tenantId))
      .returning();
      
    if (!tenant) throw new NotFoundError("Restaurante não encontrado.");

    await logAuditEvent({
      tenantId,
      operatorId,
      action: 'UPDATE_CONFIG',
      entityType: 'TENANT_CONFIG',
      entityId: tenantId,
      metadata: { action: 'UPDATE_RESTAURANTE', changes: input },
      ipAddress
    });

    return tenant;
  }

  async getFidelidade(tenantId: string) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: {
        loyaltyGracePeriodDays: true,
        loyaltyExpirationDays: true,
      }
    });

    if (!tenant) throw new NotFoundError("Restaurante não encontrado.");

    return {
      carenciaPontos: tenant.loyaltyGracePeriodDays || 0,
      expiracaoPontos: tenant.loyaltyExpirationDays || 90,
    };
  }

  async updateFidelidade(tenantId: string, input: FidelidadeInput, operatorId?: string, ipAddress?: string) {
    const [tenant] = await db.update(tenants)
      .set({
        loyaltyGracePeriodDays: input.carenciaPontos,
        loyaltyExpirationDays: input.expiracaoPontos,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenants.id, tenantId))
      .returning();

    if (!tenant) throw new NotFoundError("Restaurante não encontrado.");

    await logAuditEvent({
      tenantId,
      operatorId,
      action: 'UPDATE_CONFIG',
      entityType: 'LOYALTY_CONFIG',
      entityId: tenantId,
      metadata: { action: 'UPDATE_FIDELIDADE', changes: input },
      ipAddress
    });

    return {
      carenciaPontos: tenant.loyaltyGracePeriodDays || 0,
      expiracaoPontos: tenant.loyaltyExpirationDays || 90,
    };
  }
}

export const configuracoesService = new ConfiguracoesService();
