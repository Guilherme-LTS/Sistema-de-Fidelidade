import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { AuthenticatedRequest } from '../../infra/database/db-rls';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const adminDb = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

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

    const { rows } = await adminDb.query(
      `
        SELECT tu.id, tu.name, tu.role, tu.tenant_id
        FROM tenant_users tu
        INNER JOIN tenants t ON t.id = tu.tenant_id
        WHERE tu.user_id = $1
          AND tu.is_active = true
          AND tu.deleted_at IS NULL
          AND t.is_active = true
        LIMIT 1
      `,
      [user.id]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: 'Usuário sem perfil de funcionário associado a um Tenant.' });
    }

    // Compatibilidade com o código legado (req.usuario)
    const usuario = {
      id: rows[0].id,         // UUID do tenant_users
      user_id: user.id,       // UUID do Supabase Auth
      nome: rows[0].name,
      email: user.email,
      role: rows[0].role,
      tenant_id: rows[0].tenant_id
    };
    (req as AuthenticatedRequest).usuario = usuario;

    // Nova assinatura (req.user) oficial usada pelo db-rls.ts 
    const userObj = {
      id: user.id,
      tenant_id: rows[0].tenant_id,
      role: rows[0].role
    };
    (req as AuthenticatedRequest).user = userObj;

    next();
  } catch (err) {
    console.error('Erro na verificação de token:', err);
    res.status(500).json({ error: 'Erro ao verificar token.' });
  }
};

export default verificaToken;
