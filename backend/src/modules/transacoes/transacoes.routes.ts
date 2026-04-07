import db from '../../infra/database/db';
import { Router, Request, Response } from 'express';
import { queryWithRLS, AuthenticatedRequest } from '../../infra/database/db-rls';
import verificaToken from '../../shared/middlewares/autenticacao';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';

const router = Router();

// POST /transactions - Lançar pontos (apenas admin)
router.post('/', verificaToken, async (req: Request, res: Response) => {
  if ((req as any).usuario.role !== 'admin' && (req as any).usuario.role !== 'operador') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores ou operadores podem lançar pontos.' });
  }

  const client = await db.connect();
  try {
    const { document, valor, nome } = req.body;
    if (!document || !valor || valor <= 0) {
      return res.status(400).json({ error: 'CPF e valor (maior que zero) são obrigatórios.' });
    }
    const cpfLimpo = document.replace(/\D/g, '');
    if (!cpfValidator.isValid(cpfLimpo)) {
      return res.status(400).json({ error: 'CPF inválido.' });
    }

    const operadorId = (req as any).usuario.id;
    const pontosGanhos = Math.floor(valor);

    // Buscar configurações dinamicamente do banco de dados
    const configResult = await client.query(`
      SELECT chave, valor FROM tenant_settings 
      WHERE chave IN ('carencia_pontos', 'expiracao_pontos')
    `);
    
    // Fallback mapeado
    const configs = {
      carencia_pontos: 0,
      expiracao_pontos: 180
    };
    
    configResult.rows.forEach(row => {
      configs[row.chave as keyof typeof configs] = row.valor;
    });

    const diasParaLiberacao = configs.carencia_pontos;
    const diasParaVencimento = configs.expiracao_pontos;

    const agora = new Date();
    // A data de liberação é agora + carência
    const data_liberacao = new Date(agora.getTime() + (diasParaLiberacao * 24 * 60 * 60 * 1000));
    // A data de vencimento é contada a partir da data de liberação + tempo de expiração validado
    const data_vencimento = new Date(data_liberacao.getTime() + (diasParaVencimento * 24 * 60 * 60 * 1000));

    await client.query('BEGIN');
    let resCliente = await client.query('SELECT id FROM customers WHERE document = $1', [cpfLimpo]);
    let clienteId;

    if (!resCliente.rows[0]) {
      const resNovoCliente = await client.query('INSERT INTO customers (document, nome, lgpd_consentimento) VALUES ($1, $2, false) RETURNING id', [cpfLimpo, nome]);
      clienteId = resNovoCliente.rows[0].id;
    } else {
      clienteId = resCliente.rows[0].id;
    }

    await client.query(
      `INSERT INTO transactions (cliente_id, valor_gasto, pontos_ganhos, pontos_restantes, data_liberacao, data_vencimento, usuario_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [clienteId, valor, pontosGanhos, pontosGanhos, data_liberacao, data_vencimento, operadorId]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Transação registrada! Pontos ficarão disponíveis em breve.', pontosGanhos });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Erro ao processar a transação:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  } finally {
    if (client) client.release();
  }
});

export default router;
