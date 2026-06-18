-- ======================================================================================
-- FASE 15: ADIÇÃO DE CAMPOS DE PERFIL DO RESTAURANTE (TENANT)
-- Objetivo: Adicionar endereço estruturado, coordenadas geográficas e redes sociais na tabela tenants.
-- ======================================================================================

BEGIN;

-- Adicionando campos de endereço e localização
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS address_street VARCHAR(255),
ADD COLUMN IF NOT EXISTS address_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS address_neighborhood VARCHAR(100),
ADD COLUMN IF NOT EXISTS address_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS address_state VARCHAR(2),
ADD COLUMN IF NOT EXISTS address_zip VARCHAR(20),
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

-- Adicionando campos de redes sociais
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20),
ADD COLUMN IF NOT EXISTS instagram VARCHAR(255),
ADD COLUMN IF NOT EXISTS facebook VARCHAR(255),
ADD COLUMN IF NOT EXISTS tiktok VARCHAR(255);

COMMIT;
