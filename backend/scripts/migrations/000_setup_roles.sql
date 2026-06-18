-- ======================================================================================
-- SETUP DE ROLES E PRIVILÉGIOS (DOCUMENTAÇÃO / EXECUÇÃO ÚNICA COMO SUPERUSER)
-- Objetivo: Criar a role restrita que a aplicação Node.js usará para impor RLS.
-- ======================================================================================

-- 1. Criação do usuário fidelidade_app (se não existir)
-- Nota: Substitua a senha abaixo ou redefina-a conforme as variáveis do seu ambiente.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'fidelidade_app') THEN
        CREATE ROLE fidelidade_app WITH LOGIN PASSWORD 'guilherme27.fernando10';
    END IF;
END
$$;

-- 2. Concessão de uso do schema public
GRANT USAGE ON SCHEMA public TO fidelidade_app;

-- 3. Concessão de permissões de DML em todas as tabelas atuais do public
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fidelidade_app;

-- 4. Garantir que futuras tabelas criadas automaticamente recebam os mesmos privilégios
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fidelidade_app;

-- 5. Concessão de privilégios em sequências (necessário para campos serial/autoincremento)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fidelidade_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO fidelidade_app;
