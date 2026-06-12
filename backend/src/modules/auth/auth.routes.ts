import { Router } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { makeRegisterTenantController } from './auth.controller';

const router = Router();

router.post('/register-tenant', makeRegisterTenantController(supabaseAdmin));

export default router;
