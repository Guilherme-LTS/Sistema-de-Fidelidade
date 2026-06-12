import { Router, Request, Response } from 'express';
import { adminPool as pool } from '../../infra/database/db';

const router = Router();

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const normalizeSlugSql = `lower(trim(both '-' from regexp_replace(t.name, '[^a-zA-Z0-9]+', '-', 'g')))`;

router.get('/partners', async (req: Request, res: Response) => {
  const rawSearch = (req.query.search as string) || '';
  const search = rawSearch.trim();

  try {
    const params: any[] = [];
    let whereClause = 'WHERE t.is_active = true';

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND t.name ILIKE $${params.length}`;
    }

    const { rows } = await pool.query(
      `
        SELECT
          t.id::text AS tenant_id,
          t.name AS tenant_name,
          ${normalizeSlugSql} AS tenant_slug
        FROM tenants t
        ${whereClause}
        ORDER BY t.name ASC
        LIMIT 200
      `,
      params,
    );

    return res.status(200).json({ partners: rows });
  } catch (error) {
    console.error('Erro ao listar parceiros publicos:', error);
    return res.status(500).json({ error: 'Erro ao listar parceiros.' });
  }
});

router.get('/rewards', async (req: Request, res: Response) => {
  const tenantId = ((req.query.tenant_id as string) || '').trim();

  if (!tenantId) {
    return res.status(400).json({ error: 'tenant_id e obrigatorio.' });
  }

  if (!isUuid(tenantId)) {
    return res.status(400).json({ error: 'tenant_id invalido.' });
  }

  try {
    const { rows } = await pool.query(
      `
        SELECT r.id, r.name, r.description, r.points_cost
        FROM rewards r
        INNER JOIN tenants t ON t.id = r.tenant_id
        WHERE r.tenant_id = $1
          AND r.is_active = true
          AND t.is_active = true
        ORDER BY r.points_cost ASC
      `,
      [tenantId],
    );

    return res.status(200).json({ rewards: rows });
  } catch (error) {
    console.error('Erro ao listar recompensas publicas:', error);
    return res.status(500).json({ error: 'Erro ao listar recompensas.' });
  }
});

router.get('/pontos/:document', async (req: Request, res: Response) => {
  const rawDocument = req.params.document;
  const document = Array.isArray(rawDocument) ? rawDocument[0] : rawDocument;
  const tenantSlug = ((req.query.tenant_slug as string) || (req.query.tenant as string) || '').trim();
  const tenantId = ((req.query.tenant_id as string) || '').trim();
  const cpfLimpo = document.replace(/\D/g, '');

  if (!cpfLimpo) {
    return res.status(400).json({ error: 'Documento invalido.' });
  }

  if (!tenantId && !tenantSlug) {
    return res.status(400).json({ error: 'tenant_id ou tenant_slug e obrigatorio.' });
  }

  if (tenantId && !isUuid(tenantId)) {
    return res.status(400).json({ error: 'tenant_id invalido.' });
  }

  try {
    const { rows } = await pool.query(
      `
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
            WHEN tr.available_at <= NOW()
              AND tr.expires_at > NOW()
              AND tr.expires_at <= NOW() + INTERVAL '30 days'
            THEN tr.remaining_points
            ELSE 0
          END), 0)::int as pontos_expirando,
          MIN(CASE
            WHEN tr.available_at <= NOW() AND tr.expires_at > NOW() THEN tr.expires_at
            ELSE NULL
          END) as data_proxima_expiracao
        FROM customers c
        LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
        INNER JOIN tenants t ON c.tenant_id = t.id
        LEFT JOIN transactions tr ON tr.customer_id = c.id AND tr.tenant_id = c.tenant_id
        WHERE COALESCE(cp.document, c.document) = $1
          AND c.deleted_at IS NULL
          AND (cp.id IS NULL OR cp.deleted_at IS NULL)
          AND t.is_active = true
          AND ($2::uuid IS NULL OR c.tenant_id = $2::uuid)
          AND (
            $3::text IS NULL
            OR ${normalizeSlugSql} = lower(trim(both '-' from $3))
          )
        GROUP BY t.id, t.name, COALESCE(c.name, cp.name)
        LIMIT 1
      `,
      [cpfLimpo, tenantId || null, tenantSlug || null],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum ponto encontrado para este documento.' });
    }

    return res.status(200).json({ saldos: rows });
  } catch (error) {
    console.error('Erro na consulta publica de pontos:', error);
    return res.status(500).json({ error: 'Erro ao consultar saldos publicos.' });
  }
});

router.get('/extrato/:document', async (req: Request, res: Response) => {
  const rawDocument = req.params.document;
  const document = Array.isArray(rawDocument) ? rawDocument[0] : rawDocument;
  const tenantId = ((req.query.tenant_id as string) || '').trim();
  const cpfLimpo = document.replace(/\D/g, '');

  if (!cpfLimpo) {
    return res.status(400).json({ error: 'Documento invalido.' });
  }

  if (!tenantId) {
    return res.status(400).json({ error: 'tenant_id e obrigatorio para extrato.' });
  }

  if (!isUuid(tenantId)) {
    return res.status(400).json({ error: 'tenant_id invalido.' });
  }

  try {
    const customerResult = await pool.query(
      `
        SELECT c.id, COALESCE(c.name, cp.name) AS name
        FROM customers c
        LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
        INNER JOIN tenants t ON t.id = c.tenant_id
        WHERE COALESCE(cp.document, c.document) = $1
          AND c.tenant_id = $2
          AND c.deleted_at IS NULL
          AND (cp.id IS NULL OR cp.deleted_at IS NULL)
          AND t.is_active = true
        LIMIT 1
      `,
      [cpfLimpo, tenantId],
    );

    if (!customerResult.rows.length) {
      return res.status(404).json({ error: 'Cliente nao encontrado neste parceiro.' });
    }

    const customerId = customerResult.rows[0].id;
    const statementResult = await pool.query(
      `
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
      `,
      [customerId, tenantId],
    );

    return res.status(200).json({
      customer: {
        id: customerId,
        name: customerResult.rows[0].name,
        document: cpfLimpo,
      },
      statement: statementResult.rows,
    });
  } catch (error) {
    console.error('Erro ao consultar extrato publico:', error);
    return res.status(500).json({ error: 'Erro ao consultar extrato.' });
  }
});

router.get('/tenants/:slug', async (req: Request, res: Response) => {
  const rawSlug = req.params.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

  if (!slug) {
    return res.status(400).json({ error: 'Slug do tenant e obrigatorio.' });
  }

  try {
    const { rows } = await pool.query(
      `
        SELECT id::text as tenant_id, name as tenant_name
        FROM tenants t
        WHERE t.is_active = true
          AND ${normalizeSlugSql} = lower(trim(both '-' from $1))
        LIMIT 1
      `,
      [slug],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Tenant nao encontrado para o slug informado.' });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Erro ao resolver tenant por slug:', error);
    return res.status(500).json({ error: 'Erro ao resolver tenant.' });
  }
});

export default router;
