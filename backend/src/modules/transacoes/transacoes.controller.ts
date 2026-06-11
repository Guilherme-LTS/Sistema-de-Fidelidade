import { Request, Response } from 'express';
import { AuthenticatedRequest, withRlsTransaction } from '../../infra/database/db-rls';
import { HttpError, isHttpError } from '../../shared/errors/http-error';
import { requireTenantId, requireUserRole } from '../../shared/request-context';
import { TransacoesRepository } from './transacoes.repository';
import { TransacoesService } from './transacoes.service';

export async function lancarPontosController(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;

  try {
    requireUserRole(authReq, ['admin', 'operador'], 'Acesso negado. Apenas administradores ou operadores podem lanÃ§ar pontos.');
    const { document, valor, nome } = req.body;
    const tenantId = requireTenantId(authReq);
    const valorNumerico = Number(valor);

    if (!document || !Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      throw new HttpError(400, 'CPF e valor (maior que zero) sÃ£o obrigatÃ³rios.');
    }

    const result = await withRlsTransaction(authReq, async (client) => {
      const service = new TransacoesService(new TransacoesRepository(client));
      return service.lancarPontos({
        document,
        valor: valorNumerico,
        nome,
        operadorId: authReq.usuario?.id,
        tenantId,
        req,
      });
    });

    return res.status(201).json({
      message: 'TransaÃ§Ã£o registrada! Pontos ficarÃ£o disponÃ­veis em breve.',
      pontosGanhos: result.pontosGanhos,
    });
  } catch (error) {
    console.error('Erro ao processar a transaÃ§Ã£o:', error);
    if (isHttpError(error)) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Ocorreu um erro no servidor.', details: (error as Error).message });
  }
}
