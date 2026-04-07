import db from '../../infra/database/db';
import { Router, Request, Response } from 'express';
import { queryWithRLS, AuthenticatedRequest } from '../../infra/database/db-rls';
import verificaToken from '../../shared/middlewares/autenticacao';

const router = Router();

// GET /rewards - Listar todas as rewards (protegido)
router.get('/', verificaToken, async (req: Request, res: Response) => {
  try {
    const result = await queryWithRLS(req as AuthenticatedRequest, 'SELECT * FROM rewards WHERE ativo = true ORDER BY custo_pontos ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar rewards:', error);
    res.status(500).json({ error: 'Erro ao buscar rewards.' });
  }
});

// GET /rewards/publica - Listar rewards públicas (sem protecção)
router.get('/publica', async (req: Request, res: Response) => {
  try {
    const result = await queryWithRLS(req as AuthenticatedRequest, 'SELECT nome, custo_pontos FROM rewards WHERE ativo = true ORDER BY custo_pontos ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar rewards públicas:', error);
    res.status(500).json({ error: 'Erro ao buscar rewards.' });
  }
});

// POST /rewards - Criar nova recompensa (protegido)
router.post('/', verificaToken, async (req: Request, res: Response) => {
  const { nome, descricao, custo_pontos } = req.body;

  if (!nome || !custo_pontos) {
    return res.status(400).json({ error: 'Nome e custo em pontos são obrigatórios.' });
  }

  try {
    const novaRecompensa = await db.query(
      'INSERT INTO rewards (nome, descricao, custo_pontos) VALUES ($1, $2, $3) RETURNING *',
      [nome, descricao, custo_pontos]
    );
    res.status(201).json(novaRecompensa.rows[0]);
  } catch (error) {
    console.error('Erro ao criar recompensa:', error);
    res.status(500).json({ error: 'Erro no servidor ao criar recompensa.' });
  }
});

// PUT /rewards/:id - Atualizar recompensa (protegido)
router.put('/:id', verificaToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nome, descricao, custo_pontos } = req.body;

  if (!nome || !custo_pontos) {
    return res.status(400).json({ error: 'Nome e custo em pontos são obrigatórios.' });
  }

  try {
    const recompensaAtualizada = await db.query(
      'UPDATE rewards SET nome = $1, descricao = $2, custo_pontos = $3 WHERE id = $4 RETURNING *',
      [nome, descricao, custo_pontos, id]
    );

    if (recompensaAtualizada.rows.length === 0) {
      return res.status(404).json({ error: 'Recompensa não encontrada.' });
    }

    res.status(200).json(recompensaAtualizada.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar recompensa:', error);
    res.status(500).json({ error: 'Erro no servidor ao atualizar recompensa.' });
  }
});

// DELETE /rewards/:id - Desativar recompensa (protegido)
router.delete('/:id', verificaToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "UPDATE rewards SET ativo = false WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recompensa não encontrada.' });
    }

    res.status(200).json({ message: 'Recompensa desativada com sucesso!' });
  } catch (error) {
    console.error('Erro ao desativar recompensa:', error);
    res.status(500).json({ error: 'Erro no servidor ao desativar recompensa.' });
  }
});


export default router;
