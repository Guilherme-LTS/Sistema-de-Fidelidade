import { Request, Response } from 'express';
import { AuthenticatedRequest, withRlsTransaction } from '../../infra/database/db-rls';
import { HttpError, isHttpError } from '../../shared/errors/http-error';
import { requireTenantId } from '../../shared/request-context';
import { ResgatesRepository } from './resgates.repository';
import { ResgatesService } from './resgates.service';

export async function resgatarRecompensaController(req: Request, res: Response) {
  try {
    const { document, recompensa_id } = req.body;
    const authReq = req as AuthenticatedRequest;
    const operadorId = authReq.usuario?.id;
    const tenantId = requireTenantId(authReq);
    const cpfLimpo = (document || '').replace(/\D/g, '');

    if (!cpfLimpo || !recompensa_id) {
      throw new HttpError(400, 'CPF e ID da recompensa sÃ£o obrigatÃ³rios.');
    }

    const result = await withRlsTransaction(authReq, async (client) => {
      const service = new ResgatesService(new ResgatesRepository(client));
      return service.resgatarRecompensa({
        document: cpfLimpo,
        recompensaId: recompensa_id,
        operadorId,
        tenantId,
        req,
      });
    });

    return res.status(200).json({
      message: 'Recompensa resgatada com sucesso!',
      pontos_restantes: result.pontosRestantes,
    });
  } catch (error: any) {
    console.error('Erro no resgate:', error);
    if (isHttpError(error)) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || 'Ocorreu um erro no servidor.' });
  }
}
