import { Request } from 'express';
import { HttpError } from '../../shared/errors/http-error';
import { buildFifoDebitUpdates } from '../../shared/pontos/pontos-service';
import { ResgatesRepository } from './resgates.repository';

export type ResgatarRecompensaInput = {
  document: string;
  recompensaId: string;
  operadorId?: string | null;
  tenantId: string;
  req: Request;
};

export class ResgatesService {
  constructor(private readonly repository: ResgatesRepository) {}

  async resgatarRecompensa(input: ResgatarRecompensaInput) {
    const cpfLimpo = (input.document || '').replace(/\D/g, '');

    const cliente = await this.repository.findCustomerByDocument(input.tenantId, cpfLimpo);
    if (!cliente) {
      throw new HttpError(404, 'Cliente nÃ£o encontrado.');
    }

    const recompensa = await this.repository.findActiveReward(input.tenantId, input.recompensaId);
    if (!recompensa) {
      throw new HttpError(404, 'Recompensa nÃ£o encontrada.');
    }

    const transacoesValidas = await this.repository.lockAvailableTransactions(cliente.id, input.tenantId);
    const pontosDisponiveis = transacoesValidas.reduce((acc, transaction) => acc + transaction.remaining_points, 0);

    if (pontosDisponiveis < recompensa.points_cost) {
      throw new HttpError(409, 'Pontos disponÃ­veis insuficientes.');
    }

    const { updates } = buildFifoDebitUpdates(transacoesValidas, recompensa.points_cost);
    await this.repository.applyFifoDebits(updates, input.tenantId);

    const redemption = await this.repository.createRedemption({
      customerId: cliente.id,
      rewardId: input.recompensaId,
      pointsSpent: recompensa.points_cost,
      operatorId: input.operadorId,
      tenantId: input.tenantId,
    });

    await this.repository.logRewardRedeemed({
      req: input.req,
      tenantId: input.tenantId,
      operatorId: input.operadorId || null,
      rewardId: input.recompensaId,
      rewardName: recompensa.name,
      document: cpfLimpo,
      pointsSpent: recompensa.points_cost,
      redemptionId: redemption?.id,
    });

    return {
      pontosRestantes: pontosDisponiveis - recompensa.points_cost,
    };
  }
}
