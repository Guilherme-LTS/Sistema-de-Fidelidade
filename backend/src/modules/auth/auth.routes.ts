import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { makeRegisterTenantController } from './auth.controller';

dotenv.config();

const router = Router();

// IMPORTANTE: precisamos usar a Service Role Key para criar usuarios bypassing RLS
// e ter permissao administrativa no auth.
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

router.post('/register-tenant', makeRegisterTenantController(supabaseAdmin));

export default router;
