import { eq, and } from "drizzle-orm";
import { db } from "../../infra/database/db.js";
import { tenants, tenantUsers } from "../../infra/database/schema.js";
import { AppError, NotFoundError } from "../../shared/errors/app-error.js";

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
};

type UsuarioInput = {
  name: string;
  phone?: string;
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
    return tenant;
  }

  async updateRestaurante(tenantId: string, input: RestauranteInput) {
    const [tenant] = await db.update(tenants)
      .set({
        ...input,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenants.id, tenantId))
      .returning();
      
    if (!tenant) throw new NotFoundError("Restaurante não encontrado.");
    return tenant;
  }

  async getUsuario(tenantUserId: string) {
    const user = await db.query.tenantUsers.findFirst({
      where: eq(tenantUsers.id, tenantUserId),
    });
    if (!user) throw new NotFoundError("Usuário não encontrado.");
    return user;
  }

  async updateUsuario(tenantUserId: string, input: UsuarioInput) {
    const [user] = await db.update(tenantUsers)
      .set({
        name: input.name,
        phone: input.phone,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenantUsers.id, tenantUserId))
      .returning();
      
    if (!user) throw new NotFoundError("Usuário não encontrado.");
    return user;
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

  async updateFidelidade(tenantId: string, input: FidelidadeInput) {
    const [tenant] = await db.update(tenants)
      .set({
        loyaltyGracePeriodDays: input.carenciaPontos,
        loyaltyExpirationDays: input.expiracaoPontos,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenants.id, tenantId))
      .returning();

    if (!tenant) throw new NotFoundError("Restaurante não encontrado.");

    return {
      carenciaPontos: tenant.loyaltyGracePeriodDays || 0,
      expiracaoPontos: tenant.loyaltyExpirationDays || 90,
    };
  }
}

export const configuracoesService = new ConfiguracoesService();
