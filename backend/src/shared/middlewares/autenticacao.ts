import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import db from '../../infra/database/db';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const verificaToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    const { rows } = await db.query(
      'SELECT id, nome, role FROM funcionarios WHERE user_id = $1',
      [user.id]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: 'Usuário sem perfil de funcionário.' });
    }

    (req as any).usuario = {
      id: rows[0].id,
      user_id: user.id,
      nome: rows[0].nome,
      email: user.email,
      role: rows[0].role
    };

    next();
  } catch (err) {
    console.error('Erro na verificação de token:', err);
    res.status(500).json({ error: 'Erro ao verificar token.' });
  }
};

export default verificaToken;