"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../../infra/database/db"); // Usamos adminPool (SuperUser) para atravessar o RLS e exibir o saldo apenas pro Consumidor
const router = (0, express_1.Router)();
router.get('/partners', async (req, res) => {
    const rawSearch = req.query.search || '';
    const search = rawSearch.trim();
    try {
        const client = await db_1.adminPool.connect();
        const params = [];
        let whereClause = 'WHERE t.is_active = true';
        if (search) {
            params.push(`%${search}%`);
            whereClause += ` AND t.name ILIKE $${params.length}`;
        }
        const query = `
      SELECT
        t.id::text AS tenant_id,
        t.name AS tenant_name,
        lower(trim(both '-' from regexp_replace(t.name, '[^a-zA-Z0-9]+', '-', 'g'))) AS tenant_slug
      FROM tenants t
      ${whereClause}
      ORDER BY t.name ASC
      LIMIT 200
    `;
        const { rows } = await client.query(query, params);
        client.release();
        return res.status(200).json({ partners: rows });
    }
    catch (error) {
        console.error('Erro ao listar parceiros públicos:', error);
        return res.status(500).json({ error: 'Erro ao listar parceiros.' });
    }
});
router.get('/rewards', async (req, res) => {
    const tenantId = req.query.tenant_id || '';
    if (!tenantId) {
        return res.status(400).json({ error: 'tenant_id é obrigatório.' });
    }
    try {
        const client = await db_1.adminPool.connect();
        const query = `
      SELECT id, name, description, points_cost
      FROM rewards
      WHERE tenant_id = $1
        AND is_active = true
      ORDER BY points_cost ASC
    `;
        const { rows } = await client.query(query, [tenantId]);
        client.release();
        return res.status(200).json({ rewards: rows });
    }
    catch (error) {
        console.error('Erro ao listar recompensas públicas:', error);
        return res.status(500).json({ error: 'Erro ao listar recompensas.' });
    }
});
/**
 * Consulta Pública de Pontos (Portal do Consumidor final).
 *
 * Se "tenantSlug" for fornecido, a consulta filtra o saldo apenas para o estabelecimento que ele escolheu (via QR Code).
 * Se não for, lista todos os estabelecimentos nos quais ele possui conta baseando-se unicamente no seu documento.
 */
router.get('/pontos/:document', async (req, res) => {
    const rawDocument = req.params.document;
    const document = Array.isArray(rawDocument) ? rawDocument[0] : rawDocument;
    const tenantSlug = req.query.tenant;
    const tenantSlugNormalized = req.query.tenant_slug;
    const tenantId = req.query.tenant_id;
    const cpfLimpo = document.replace(/\D/g, '');
    if (!cpfLimpo) {
        return res.status(400).json({ error: 'Documento inválido.' });
    }
    try {
        const client = await db_1.adminPool.connect();
        let rows;
        if (tenantId || tenantSlug || tenantSlugNormalized) {
            const queryStr = `
        SELECT
          t.id::text as tenant_id,
          t.name as tenant_name,
          COALESCE(c.name, cp.name) as customer_name,
          COALESCE(SUM(CASE
            WHEN tr.available_at <= NOW() AND tr.expires_at > NOW()
            THEN tr.remaining_points
            ELSE 0
          END), 0)::int as pontos_disponiveis,
          COALESCE(SUM(CASE
            WHEN tr.available_at > NOW()
            THEN tr.remaining_points
            ELSE 0
          END), 0)::int as pontos_pendentes,
          MIN(CASE
            WHEN tr.available_at > NOW() THEN tr.available_at
            ELSE NULL
          END) as data_proxima_liberacao,
          COALESCE(SUM(CASE
            WHEN tr.available_at <= NOW() AND tr.expires_at > NOW() AND tr.expires_at <= NOW() + INTERVAL '30 days'
            THEN tr.remaining_points
            ELSE 0
          END), 0)::int as pontos_expirando,
          MIN(CASE
            WHEN tr.available_at <= NOW() AND tr.expires_at > NOW() THEN tr.expires_at
            ELSE NULL
          END) as data_proxima_expiracao
        FROM customers c
        LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
        JOIN tenants t ON c.tenant_id = t.id
        LEFT JOIN transactions tr ON tr.customer_id = c.id AND tr.tenant_id = c.tenant_id
        WHERE COALESCE(cp.document, c.document) = $1
          AND c.deleted_at IS NULL
          AND c.tenant_id = COALESCE($2::uuid, c.tenant_id)
          AND t.name = COALESCE($3, t.name)
          AND (
            $4::text IS NULL
            OR lower(trim(both '-' from regexp_replace(t.name, '[^a-zA-Z0-9]+', '-', 'g'))) = lower(trim(both '-' from $4))
          )
        GROUP BY t.id, t.name, COALESCE(c.name, cp.name)
      `;
            const params = [cpfLimpo, tenantId || null, tenantSlug || null, tenantSlugNormalized || null];
            const result = await client.query(queryStr, params);
            rows = result.rows;
        }
        else {
            const queryStr = `
        SELECT
          t.id::text as tenant_id,
          t.name as tenant_name,
          COALESCE(c.name, cp.name) as customer_name,
          COALESCE(SUM(CASE
            WHEN tr.available_at <= NOW() AND tr.expires_at > NOW()
            THEN tr.remaining_points
            ELSE 0
          END), 0)::int as pontos_disponiveis,
          COALESCE(SUM(CASE
            WHEN tr.available_at > NOW()
            THEN tr.remaining_points
            ELSE 0
          END), 0)::int as pontos_pendentes,
          MIN(CASE
            WHEN tr.available_at > NOW() THEN tr.available_at
            ELSE NULL
          END) as data_proxima_liberacao,
          COALESCE(SUM(CASE
            WHEN tr.available_at <= NOW() AND tr.expires_at > NOW() AND tr.expires_at <= NOW() + INTERVAL '30 days'
            THEN tr.remaining_points
            ELSE 0
          END), 0)::int as pontos_expirando,
          MIN(CASE
            WHEN tr.available_at <= NOW() AND tr.expires_at > NOW() THEN tr.expires_at
            ELSE NULL
          END) as data_proxima_expiracao
        FROM customers c
        LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
        JOIN tenants t ON c.tenant_id = t.id
        LEFT JOIN transactions tr ON tr.customer_id = c.id AND tr.tenant_id = c.tenant_id
        WHERE COALESCE(cp.document, c.document) = $1
          AND c.deleted_at IS NULL
        GROUP BY t.id, t.name, COALESCE(c.name, cp.name)
        ORDER BY t.name ASC
      `;
            const result = await client.query(queryStr, [cpfLimpo]);
            rows = result.rows;
        }
        client.release();
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Nenhum ponto encontrado para este documento.' });
        }
        res.status(200).json({ saldos: rows });
    }
    catch (error) {
        console.error('Erro na consulta pública de pontos:', error);
        res.status(500).json({ error: 'Erro ao consultar saldos públicos.' });
    }
});
router.get('/extrato/:document', async (req, res) => {
    const rawDocument = req.params.document;
    const document = Array.isArray(rawDocument) ? rawDocument[0] : rawDocument;
    const tenantId = req.query.tenant_id || '';
    const cpfLimpo = document.replace(/\D/g, '');
    if (!cpfLimpo) {
        return res.status(400).json({ error: 'Documento inválido.' });
    }
    if (!tenantId) {
        return res.status(400).json({ error: 'tenant_id é obrigatório para extrato.' });
    }
    try {
        const client = await db_1.adminPool.connect();
        const customerResult = await client.query(`
        SELECT c.id, COALESCE(c.name, cp.name) AS name
        FROM customers c
        LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
        WHERE COALESCE(cp.document, c.document) = $1
          AND c.tenant_id = $2
          AND c.deleted_at IS NULL
          AND cp.deleted_at IS NULL
        LIMIT 1
      `, [cpfLimpo, tenantId]);
        if (!customerResult.rows.length) {
            client.release();
            return res.status(404).json({ error: 'Cliente não encontrado neste parceiro.' });
        }
        const customerId = customerResult.rows[0].id;
        const statementResult = await client.query(`
        SELECT * FROM (
          SELECT
            'credito' AS tipo,
            t.points_earned AS pontos,
            t.created_at AS data,
            'Pontos por compra' AS descricao
          FROM transactions t
          WHERE t.customer_id = $1
            AND t.tenant_id = $2

          UNION ALL

          SELECT
            'debito' AS tipo,
            r.points_spent AS pontos,
            r.created_at AS data,
            COALESCE(w.name, 'Resgate de recompensa') AS descricao
          FROM redemptions r
          LEFT JOIN rewards w ON w.id = r.reward_id
          WHERE r.customer_id = $1
            AND r.tenant_id = $2
        ) AS extrato
        ORDER BY data DESC
        LIMIT 100
      `, [customerId, tenantId]);
        client.release();
        return res.status(200).json({
            customer: {
                id: customerId,
                name: customerResult.rows[0].name,
                document: cpfLimpo,
            },
            statement: statementResult.rows,
        });
    }
    catch (error) {
        console.error('Erro ao consultar extrato público:', error);
        return res.status(500).json({ error: 'Erro ao consultar extrato.' });
    }
});
router.get('/tenants/:slug', async (req, res) => {
    const rawSlug = req.params.slug;
    const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
    if (!slug) {
        return res.status(400).json({ error: 'Slug do tenant é obrigatório.' });
    }
    try {
        const client = await db_1.adminPool.connect();
        const query = `
      SELECT id::text as tenant_id, name as tenant_name
      FROM tenants
      WHERE is_active = true
        AND lower(trim(both '-' from regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) = lower(trim(both '-' from $1))
      LIMIT 1
    `;
        const { rows } = await client.query(query, [slug]);
        client.release();
        if (!rows.length) {
            return res.status(404).json({ error: 'Tenant não encontrado para o slug informado.' });
        }
        return res.status(200).json(rows[0]);
    }
    catch (error) {
        console.error('Erro ao resolver tenant por slug:', error);
        return res.status(500).json({ error: 'Erro ao resolver tenant.' });
    }
});
exports.default = router;
