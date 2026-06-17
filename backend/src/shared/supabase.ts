import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('AVISO: Variáveis do Supabase Service Role não estão configuradas.');
}

// Cliente com a Service Key (IGNORA RLS do banco! Cuidado, usar apenas no backend em rotas protegidas)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
