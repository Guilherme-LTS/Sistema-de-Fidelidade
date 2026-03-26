import { Router, Request, Response } from 'express';
import db from '../../infra/database/db';
import verificaToken from '../../shared/middlewares/autenticacao';

const router = Router();

// POST /resgates - Resgatar recompensa
router.post('/', verificaToken, async (req: Request, res: Response) => {
  const client = await db.connect();
  try {
    const { cpf, recompensa_id } = req.body;
    const operadorId = (req as any).usuario.id;
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (!cpfLimpo || !recompensa_id) {
      return res.status(400).json({ error: 'CPF e ID da recompensa são obrigatórios.' });
    }

    await client.query('BEGIN');
    const clienteResult = await client.query('SELECT id FROM clientes WHERE cpf = $1', [cpfLimpo]);
    const cliente = clienteResult.rows[0];
    if (!cliente) throw new Error('Cliente não encontrado.');

    const recompensaResult = await client.query('SELECT custo_pontos FROM recompensas WHERE id = $1', [recompensa_id]);
    const recompensa = recompensaResult.rows[0];
    if (!recompensa) throw new Error('Recompensa não encontrada.');

    // 1. Busca transações válidas via FIFO
    const transacoesValidas = await client.query(
      `SELECT id, pontos_restantes FROM transacoes 
       WHERE cliente_id = $1 AND pontos_restantes > 0 
       AND data_liberacao <= NOW() AND data_vencimento > NOW()
       ORDER BY data_vencimento ASC, data_transacao ASC`,
      [cliente.id]
    );

    const pontosDisponiveis = transacoesValidas.rows.reduce((acc, t) => acc + t.pontos_restantes, 0);

    if (pontosDisponiveis < recompensa.custo_pontos) {
      throw new Error('Pontos disponíveis insuficientes.');
    }

    // 2. Aplica débito abatendo FIFO das transações
    let pontosNecessarios = recompensa.custo_pontos;
    for (const t of transacoesValidas.rows) {
      if (pontosNecessarios <= 0) break;
      
      const descontar = Math.min(t.pontos_restantes, pontosNecessarios);
      pontosNecessarios -= descontar;
      
      await client.query(
        'UPDATE transacoes SET pontos_restantes = pontos_restantes - $1 WHERE id = $2',
        [descontar, t.id]
      );
    }

    // 3. Registra histórico do resgate
    await client.query(
      'INSERT INTO resgates (cliente_id, recompensa_id, pontos_gastos, usuario_id) VALUES ($1, $2, $3, $4)',
      [cliente.id, recompensa_id, recompensa.custo_pontos, operadorId]
    );

    await client.query('COMMIT');

    const pontosRestantes = pontosDisponiveis - recompensa.custo_pontos;
    res.status(200).json({ message: 'Recompensa resgatada com sucesso!', pontos_restantes: pontosRestantes });
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('Erro no resgate:', error);
    res.status(500).json({ error: error.message || 'Ocorreu um erro no servidor.' });
  } finally {
    if (client) client.release();
  }
});

export default router;