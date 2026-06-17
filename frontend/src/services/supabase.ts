import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('AVISO: Variáveis REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY não estão definidas no .env.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
