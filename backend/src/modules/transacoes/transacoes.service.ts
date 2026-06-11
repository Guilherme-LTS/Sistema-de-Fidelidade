import { Request } from 'express';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';
import { HttpError } from '../../shared/errors/http-error';
import { calculatePointTimelines } from '../../shared/pontos/pontos-service';
import { TransacoesRepository } from './transacoes.repository';

export type LancarPontosInput = {
  document: string;
  valor: number;
  nome?: string | null;
  operadorId?: string | null;
  tenantId: string;
  req: Request;
};

export class TransacoesService {
  constructor(private readonly repository: TransacoesRepository) {}

  async lancarPontos(input: LancarPontosInput) {
    const cpfLimpo = (input.document || '').replace(/\D/g, '');

    if (!cpfValidator.isValid(cpfLimpo)) {
      throw new HttpError(400, 'CPF invÃ¡lido.');
    }

    const pontosGanhos = Math.floor(input.valor);
    const configs = await this.repository.loadPointSettings(input.tenantId);
    const { availableAt, expiresAt } = calculatePointTimelines(
      configs.carencia_pontos,
      configs.expiracao_pontos,
    );

    const cliente = await this.repository.upsertCustomer({
      tenantId: input.tenantId,
      document: cpfLimpo,
      name: input.nome,
    });

    const transaction = await this.repository.createPointsTransaction({
      customerId: cliente.id,
      amountSpent: input.valor,
      pointsEarned: pontosGanhos,
      availableAt,
      expiresAt,
      operatorId: input.operadorId,
      tenantId: input.tenantId,
    });

    try {
      await this.repository.withSavepoint('audit_log', async () => {
        await this.repository.logPointsCreated({
          req: input.req,
          tenantId: input.tenantId,
          operatorId: input.operadorId || null,
          pointsEarned: pontosGanhos,
          amountSpent: input.valor,
          document: cpfLimpo,
          targetLabel: cliente.name || input.nome || `CPF ${cpfLimpo}`,
          transactionId: transaction?.id,
        });
      });
    } catch (auditError) {
      console.error('Falha ao registrar auditoria do lanÃ§amento de pontos:', auditError);
    }

    return { pontosGanhos };
  }
}
