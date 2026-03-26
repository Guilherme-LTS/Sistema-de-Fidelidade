"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const db_1 = __importDefault(require("../../infra/database/db"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
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
        const { rows } = await db_1.default.query('SELECT id, nome, role FROM funcionarios WHERE user_id = $1', [user.id]);
        if (rows.length === 0) {
            return res.status(403).json({ error: 'Usuário sem perfil de funcionário.' });
        }
        req.usuario = {
            id: rows[0].id,
            user_id: user.id,
            nome: rows[0].nome,
            email: user.email,
            role: rows[0].role
        };
        next();
    }
    catch (err) {
        console.error('Erro na verificação de token:', err);
        res.status(500).json({ error: 'Erro ao verificar token.' });
    }
};
exports.default = verificaToken;
