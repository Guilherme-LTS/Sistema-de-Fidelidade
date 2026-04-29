"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_js_1 = require("@supabase/supabase-js");
const db_1 = __importDefault(require("../../infra/database/db")); // ATENÇÃO: Aqui usamos pool.query intencionalmente, pois registro ocorre FORA do RLS
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = (0, express_1.Router)();
// IMPORTANTE: precisamos usar a Service Role Key para criar usuários bypassing RLS
// e ter permissão administrativa no auth.
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
const DEFAULT_CARENCIA_PONTOS = 0;
const DEFAULT_EXPIRACAO_PONTOS = 180;
router.post('/register-tenant', async (req, res) => {
    const { tenant_name, document, email, password, admin_name } = req.body;
    if (!email || !password || !tenant_name) {
        return res.status(400).json({ error: 'Faltam campos obrigatórios (tenant_name, email, password).' });
    }
    const client = await db_1.default.connect();
    try {
        await client.query('BEGIN');
        // 1. Criar o Auth User no Supabase
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Já cria confirmado
        });
        if (authError || !authData.user) {
            throw new Error(`Erro ao criar conta de Auth: ${authError?.message}`);
        }
        const supabaseUserId = authData.user.id;
        // 2. Criar a "Empresa" / Tenant no banco de dados usando o UID real do Supabase Auth
        const tenantId = supabaseUserId;
        await client.query(`INSERT INTO tenants (id, name, document, is_active) VALUES ($1, $2, $3, true)`, [tenantId, tenant_name, document || null]);
        // 3. Criar o Funcionário (Admin do Tenant recém criado)
        await client.query(`INSERT INTO tenant_users (user_id, tenant_id, name, role, is_active) VALUES ($1, $2, $3, $4, true)`, [supabaseUserId, tenantId, admin_name || 'Gestor(a)', 'admin']);
        // 4. Seed inicial de configurações do tenant
        await client.query(`INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_unit, updated_at)
       VALUES
         ($1, 'carencia_pontos', $2, 'dias', NOW()),
         ($1, 'expiracao_pontos', $3, 'dias', NOW())
       ON CONFLICT (tenant_id, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, setting_unit = EXCLUDED.setting_unit, updated_at = NOW()`, [tenantId, DEFAULT_CARENCIA_PONTOS, DEFAULT_EXPIRACAO_PONTOS]);
        // 5. Guardar o tenant_id no JWT app_metadata do Supabase para reforço
        await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
            app_metadata: { tenant_id: tenantId, role: 'admin' },
        });
        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            message: 'Restaurante cadastrado com sucesso!',
            tenant_id: tenantId
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro no registro do Tenant:', error);
        res.status(500).json({ error: error.message });
    }
    finally {
        client.release();
    }
});
exports.default = router;
