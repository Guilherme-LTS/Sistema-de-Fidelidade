"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
const adminDb = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});
const verificaToken = async (req, res, next) => {
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
        const { rows } = await adminDb.query('SELECT id, name, role, tenant_id FROM tenant_users WHERE user_id = $1 LIMIT 1', [user.id]);
        if (rows.length === 0) {
            return res.status(403).json({ error: 'Usuário sem perfil de funcionário associado a um Tenant.' });
        }
        // Compatibilidade com o código legado (req.usuario)
        const usuario = {
            id: rows[0].id, // UUID do tenant_users
            user_id: user.id, // UUID do Supabase Auth
            nome: rows[0].name,
            email: user.email,
            role: rows[0].role,
            tenant_id: rows[0].tenant_id
        };
        req.usuario = usuario;
        // Nova assinatura (req.user) oficial usada pelo db-rls.ts 
        const userObj = {
            id: user.id,
            tenant_id: rows[0].tenant_id,
            role: rows[0].role
        };
        req.user = userObj;
        next();
    }
    catch (err) {
        console.error('Erro na verificação de token:', err);
        res.status(500).json({ error: 'Erro ao verificar token.' });
    }
};
exports.default = verificaToken;
