-- ============================================================================
-- Teste de Validação: Bug Fix /public/pontos - Consumer Profiles 
-- ============================================================================
-- Este script testa se o fix para restauração de deleted_at funciona
-- Cenário: Cliente com CPF recriado após soft delete do consumer_profile

BEGIN;

-- 1. Verificar estado atual: customer com consumer_profile válido
SELECT 'TESTE 1: Verificar customer Guilherme com consumer_profile válido' AS test_name;
SELECT 
  c.id as customer_id,
  COALESCE(cp.document, c.document) as document,
  COALESCE(c.name, cp.name) as name,
  c.consumer_profile_id,
  cp.deleted_at as cp_deleted_at,
  c.deleted_at as c_deleted_at,
  COALESCE(SUM(tr.remaining_points), 0) as total_points
FROM customers c
LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
LEFT JOIN transactions tr ON tr.customer_id = c.id
WHERE c.document = '70439493277' OR (cp.document = '70439493277' AND cp.deleted_at IS NULL)
GROUP BY c.id, c.name, cp.id, cp.document, cp.deleted_at, c.deleted_at;

-- 2. Validar que a query pública SEM filtro de deleted_at retorna resultado
SELECT 'TESTE 2: Query pública sem filtro (cp.deleted_at IS NULL OR cp.id IS NULL)' AS test_name;
WITH filtered_data AS (
  SELECT
    t.id::text as tenant_id,
    t.name as tenant_name,
    COALESCE(c.name, cp.name) as customer_name,
    COALESCE(SUM(CASE
      WHEN tr.available_at <= NOW() AND tr.expires_at > NOW()
      THEN tr.remaining_points
      ELSE 0
    END), 0)::int as pontos_disponiveis
  FROM customers c
  LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
  JOIN tenants t ON c.tenant_id = t.id
  LEFT JOIN transactions tr ON tr.customer_id = c.id AND tr.tenant_id = c.tenant_id
  WHERE COALESCE(cp.document, c.document) = '70439493277'
    AND c.deleted_at IS NULL
  GROUP BY t.id, t.name, COALESCE(c.name, cp.name)
)
SELECT * FROM filtered_data;

-- 3. Comparação: Antes (com filtro deleted_at) vs Depois (sem filtro)
SELECT 'TESTE 3: Comparação - com filtro vs sem filtro' AS test_name;
SELECT 
  'COM filtro (cp.deleted_at IS NULL OR cp.id IS NULL)' as query_variant,
  COUNT(*) as result_count
FROM customers c
LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
WHERE COALESCE(cp.document, c.document) = '70439493277'
  AND c.deleted_at IS NULL
  AND (cp.deleted_at IS NULL OR cp.id IS NULL)
UNION ALL
SELECT 
  'SEM filtro (corrigido)' as query_variant,
  COUNT(*) as result_count
FROM customers c
LEFT JOIN consumer_profiles cp ON cp.id = c.consumer_profile_id
WHERE COALESCE(cp.document, c.document) = '70439493277'
  AND c.deleted_at IS NULL;

ROLLBACK;
