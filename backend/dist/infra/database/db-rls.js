"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryWithRLS = exports.withRlsTransaction = exports.resetRlsClaims = exports.setRlsClaims = void 0;
const db_1 = __importDefault(require("./db"));
/**
 * Sanitiza string JSON para uso seguro em SET LOCAL (evita SQL injection)
 */
function sanitizeJsonForSQL(jsonStr) {
    // Escapa aspas simples (método padrão PostgreSQL)
    return jsonStr.replace(/'/g, "''");
}
const setRlsClaims = async (client, req) => {
    const tenantId = req.user?.tenant_id || req.usuario?.tenant_id || null;
    const userId = req.user?.id || req.usuario?.id || null;
    const role = req.user?.role || req.usuario?.role || 'authenticated';
    const jwtClaims = JSON.stringify({
        sub: userId,
        tenant_id: tenantId,
        role: role,
        // Adicionamos campos extras que o Supabase costuma esperar
        email: req.usuario?.email || '',
        app_metadata: { provider: 'email' },
        user_metadata: { name: req.usuario?.nome || '' }
    });
    const sanitizedClaims = sanitizeJsonForSQL(jwtClaims);
    try {
        // 1. Configuramos as claims do JWT
        await client.query(`SET LOCAL request.jwt.claims = '${sanitizedClaims}'`);
        // 3. Configuramos especificamente o tenant_id em uma variável separada se necessário por alguma policy customizada
        if (tenantId) {
            await client.query(`SET LOCAL app.current_tenant = '${tenantId}'`);
        }
    }
    catch (err) {
        console.error('Erro ao configurar claims de RLS:', err.message);
        throw err;
    }
};
exports.setRlsClaims = setRlsClaims;
const resetRlsClaims = async (client) => {
    await client.query('RESET request.jwt.claims');
};
exports.resetRlsClaims = resetRlsClaims;
const withRlsTransaction = async (req, handler) => {
    const client = await db_1.default.connect();
    try {
        await client.query('BEGIN');
        await (0, exports.setRlsClaims)(client, req);
        const result = await handler(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK').catch(() => { });
        throw error;
    }
    finally {
        await (0, exports.resetRlsClaims)(client).catch(() => { });
        client.release();
    }
};
exports.withRlsTransaction = withRlsTransaction;
/**
 * Wrapper de Transação para o PostgreSQL via node-pg.
 * Ele força o Banco de Dados a assumir as características do JWT por sessão,
 * fazendo com que a Row Level Security (RLS) no Supabase bloqueie os dados
 * dos outros tenants antes mesmo da cláusula WHERE.
 *
 * Por que precisamos disso?
 * R: O Supabase Postgres usa RLS no nível do Supabase Auth.
 * Quando conectamos pelo Pool puro (usuário db_postgres), nós ignoramos o RLS.
 * Com esse Wrapper, usamos "SET LOCAL request.jwt.claims", mentindo pro
 * Postgres que somos um JWT validado com as claims certas.
 */
const queryWithRLS = async (req, queryStr, params = []) => {
    const client = await db_1.default.connect();
    try {
        // 1. Iniciar Transação
        await client.query('BEGIN');
        // 2. Montar as claims seguras para injeção (Garante que se não houver tenant_id, não vaza dados)
        const jwtClaims = JSON.stringify({
            sub: req.user?.id || null, // Subject
            tenant_id: req.user?.tenant_id || null, // O metadado Custom (Isolador Multi-tenant)
            role: req.user?.role || 'anon' // Papel no sistema
        });
        // 3. Forçar as claims na sessão atual da conexão. Configura RLS!
        // SEGURO: Escapamos a string JSON para evitar SQL injection via aspas
        const sanitizedClaims = sanitizeJsonForSQL(jwtClaims);
        await client.query(`SET LOCAL request.jwt.claims = '${sanitizedClaims}'`);
        // 4. Executar a query verdadeira e limpa (ex: "SELECT * FROM customers")
        const result = await client.query(queryStr, params);
        // 5. Finalizar 
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        // Opcional de segurança para limpar contexto da conexão antes de voltar pro Pool
        await client.query("RESET request.jwt.claims").catch(() => { });
        client.release();
    }
};
exports.queryWithRLS = queryWithRLS;
