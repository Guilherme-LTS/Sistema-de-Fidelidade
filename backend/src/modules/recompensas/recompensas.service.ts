import { Request } from 'express';
import { HttpError } from '../../shared/errors/http-error';
import { RecompensasRepository } from './recompensas.repository';

export class RecompensasService {
  constructor(private readonly repository: RecompensasRepository) {}

  async listarAtivas(tenantId: string) {
    return this.repository.listActive(tenantId);
  }

  async listarPublicas(tenantId: string) {
    return this.repository.listPublic(tenantId);
  }

  async criar(input: {
    tenantId: string;
    nome: string;
    descricao?: string | null;
    custoPontos: unknown;
    operatorId?: string | null;
    req: Request;
  }) {
    const pointsCost = this.parseReward(input.nome, input.custoPontos);
    const recompensa = await this.repository.create({
      name: input.nome,
      description: input.descricao,
      pointsCost,
      tenantId: input.tenantId,
    });

    await this.repository.logRewardEvent({
      req: input.req,
      tenantId: input.tenantId,
      operatorId: input.operatorId,
      action: 'CRIACAO_RECOMPENSA',
      details: `Recompensa criada: ${input.nome} (${pointsCost} pontos).`,
      targetLabel: String(input.nome),
      impactLabel: `-${pointsCost} pts (custo)`,
      rewardId: recompensa?.id,
    });

    return recompensa;
  }

  async atualizar(input: {
    id: string;
    tenantId: string;
    nome: string;
    descricao?: string | null;
    custoPontos: unknown;
    operatorId?: string | null;
    req: Request;
  }) {
    const pointsCost = this.parseReward(input.nome, input.custoPontos);
    const recompensa = await this.repository.update({
      id: input.id,
      name: input.nome,
      description: input.descricao,
      pointsCost,
      tenantId: input.tenantId,
    });

    if (!recompensa) {
      throw new HttpError(404, 'Recompensa nÃ£o encontrada.');
    }

    await this.repository.logRewardEvent({
      req: input.req,
      tenantId: input.tenantId,
      operatorId: input.operatorId,
      action: 'EDICAO_RECOMPENSA',
      details: `Recompensa atualizada: ${input.nome} (${pointsCost} pontos).`,
      targetLabel: String(input.nome),
      impactLabel: `-${pointsCost} pts (custo)`,
      rewardId: recompensa.id,
    });

    return recompensa;
  }

  async desativar(input: {
    id: string;
    tenantId: string;
    operatorId?: string | null;
    req: Request;
  }) {
    const recompensa = await this.repository.deactivate({
      id: input.id,
      tenantId: input.tenantId,
    });

    if (!recompensa) {
      throw new HttpError(404, 'Recompensa nÃ£o encontrada.');
    }

    await this.repository.logRewardEvent({
      req: input.req,
      tenantId: input.tenantId,
      operatorId: input.operatorId,
      action: 'DESATIVACAO_RECOMPENSA',
      details: `Recompensa ID ${input.id} desativada.`,
      targetLabel: `Recompensa #${input.id}`,
      impactLabel: 'Inativada',
      rewardId: input.id,
    });

    return { message: 'Recompensa desativada com sucesso!' };
  }

  private parseReward(name: string, pointsCostInput: unknown) {
    if (!name || pointsCostInput === undefined || pointsCostInput === null || pointsCostInput === '') {
      throw new HttpError(400, 'Nome e custo em pontos sÃ£o obrigatÃ³rios.');
    }

    const pointsCost = Number(pointsCostInput);
    if (!Number.isFinite(pointsCost)) {
      throw new HttpError(400, 'Nome e custo em pontos sÃ£o obrigatÃ³rios.');
    }

    if (!Number.isInteger(pointsCost) || pointsCost <= 0) {
      throw new HttpError(400, 'Custo em pontos deve ser um numero inteiro maior que zero.');
    }

    return pointsCost;
  }
}
