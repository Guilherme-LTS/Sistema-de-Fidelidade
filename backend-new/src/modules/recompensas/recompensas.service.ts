import { eq, and, desc } from "drizzle-orm";
import { db } from "../../infra/database/db.js";
import { rewards } from "../../infra/database/schema.js";
import { AppError, NotFoundError } from "../../shared/errors/app-error.js";

type CriarRecompensaInput = {
  tenantId: string;
  name: string;
  description?: string;
  pointsCost: number;
  isActive?: boolean;
};

type AtualizarRecompensaInput = Partial<CriarRecompensaInput> & { id: number };

export class RecompensasService {
  async listarRecompensas(tenantId: string) {
    const data = await db.query.rewards.findMany({
      where: (r, { eq, and, isNull }) => and(eq(r.tenantId, tenantId), isNull(r.deletedAt)),
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    });
    return data;
  }

  async criarRecompensa(input: CriarRecompensaInput) {
    if (input.pointsCost <= 0) {
      throw new AppError("O custo em pontos deve ser maior que zero.");
    }

    const [recompensa] = await db.insert(rewards).values({
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      pointsCost: input.pointsCost,
      isActive: input.isActive ?? true,
    }).returning();

    return recompensa;
  }

  async atualizarRecompensa(tenantId: string, input: AtualizarRecompensaInput) {
    const { id, ...data } = input;

    const [recompensa] = await db.update(rewards)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(and(eq(rewards.id, id), eq(rewards.tenantId, tenantId)))
      .returning();

    if (!recompensa) {
      throw new NotFoundError("Recompensa não encontrada.");
    }

    return recompensa;
  }

  async excluirRecompensa(tenantId: string, id: number) {
    // Soft delete ou hard delete? Depende da regra de negócios. No legacy, geralmente soft delete para não quebrar redemptions
    const [recompensa] = await db.update(rewards)
      .set({ deletedAt: new Date().toISOString(), isActive: false })
      .where(and(eq(rewards.id, id), eq(rewards.tenantId, tenantId)))
      .returning();

    if (!recompensa) {
      throw new NotFoundError("Recompensa não encontrada.");
    }

    return { success: true };
  }
}

export const recompensasService = new RecompensasService();
