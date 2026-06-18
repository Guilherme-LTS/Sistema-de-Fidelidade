-- Inicialização de tabelas base para um banco de dados totalmente novo
-- Estas tabelas representam o estado original antes da fase 1 da evolução (DDL).

CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf VARCHAR(14) UNIQUE,
    nome VARCHAR(255) NOT NULL,
    pontos_totais INT DEFAULT 0,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    lgpd_consentimento BOOLEAN DEFAULT false,
    data_consentimento TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    email VARCHAR(255) UNIQUE
);

CREATE TABLE IF NOT EXISTS recompensas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    custo_pontos INT NOT NULL,
    ativo BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS transacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id),
    valor_gasto DECIMAL(10,2) NOT NULL,
    pontos_ganhos INT NOT NULL,
    data_transacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_liberacao TIMESTAMP WITH TIME ZONE,
    data_vencimento TIMESTAMP WITH TIME ZONE,
    usuario_id UUID REFERENCES funcionarios(id),
    pontos_restantes INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS resgates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id),
    recompensa_id UUID REFERENCES recompensas(id),
    pontos_gastos INT NOT NULL,
    data_resgate TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario_id UUID REFERENCES funcionarios(id)
);

CREATE TABLE IF NOT EXISTS configuracoes (
    chave VARCHAR(50) PRIMARY KEY,
    valor INT,
    unidade VARCHAR(20)
);

-- Insere as configurações padrão caso não existam
INSERT INTO configuracoes (chave, valor, unidade) 
VALUES ('expiracao_pontos', 6, 'meses') 
ON CONFLICT (chave) DO NOTHING;
