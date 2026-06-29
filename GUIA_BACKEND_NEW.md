# Guia de Criacao do `backend-new`

Este documento orienta a criacao de um novo backend para o Sistema de Fidelidade, seguindo a mesma estrategia adotada no `frontend-new`: criar uma base moderna em paralelo ao legado, validar a fundacao arquitetural e migrar funcionalidades gradualmente.

O objetivo nao e reescrever tudo de uma vez. O backend atual continua funcionando enquanto o `backend-new` nasce como a nova base tecnica do produto.

## Objetivos

- Criar uma arquitetura limpa, modular e preparada para SaaS multi-tenant.
- Reduzir divida tecnica acumulada no backend atual.
- Padronizar configuracao, validacao, logs, autenticacao, autorizacao e erros.
- Permitir migracao incremental por dominio sem quebrar o sistema legado.
- Criar uma base segura para crescimento futuro do produto.

## Principios Arquiteturais

1. **Backend novo independente**
   - Criar uma pasta `backend-new/`.
   - Nao modificar o backend legado durante a fundacao.
   - O backend legado vira referencia funcional e fallback operacional.

2. **Modular monolith**
   - Comecar como monolito modular, nao microservices.
   - Separar dominios em modulos claros: `auth`, `tenants`, `clientes`, `transacoes`, `recompensas`, `resgates`, `dashboard`, `configuracoes`, `auditoria`, `public`.
   - Cada modulo deve ter fronteiras internas consistentes.

3. **Camadas bem definidas**
   - `routes`: definicao HTTP.
   - `controller`: traducao request/response.
   - `service`: regra de negocio.
   - `repository`: acesso a dados.
   - `schemas`: validacao de entrada/saida.
   - `types`: tipos especificos do dominio.

4. **Tenant context obrigatorio**
   - Toda rota autenticada deve ter um contexto de tenant.
   - Regras multi-tenant nao devem depender de memoria do desenvolvedor.
   - O tenant deve ser extraido no middleware e propagado de forma explicita.

5. **Validacao em borda**
   - Validar `params`, `query`, `body` e `env` com Zod.
   - Nao deixar payload cru chegar em services.

6. **Segredos nunca no frontend**
   - Service role, database URL admin e secrets ficam apenas no backend.
   - O backend novo deve ter uma politica clara para variaveis publicas e privadas.

7. **Migracao incremental**
   - Migrar primeiro rotas de leitura e baixo risco.
   - Migrar escritas somente depois de testes e comparacao com legado.
   - Evitar big bang rewrite.

## Stack Recomendada

Stack principal:

```text
Node.js + TypeScript + Fastify + Zod + PostgreSQL/Supabase + Drizzle + Pino + Vitest
```

Dependencias de runtime recomendadas:

```text
fastify
@fastify/cors
@fastify/helmet
@fastify/rate-limit
zod
dotenv
pg
drizzle-orm
pino
@supabase/supabase-js
```

Dependencias de desenvolvimento:

```text
typescript
tsx
vitest
@types/node
eslint
prettier
drizzle-kit
pino-pretty
```

### Por que Fastify?

- Mais leve e performatico que Express.
- Bom ecossistema de plugins.
- Facil de estruturar sem excesso de cerimonia.
- Adequado para APIs SaaS com crescimento gradual.

### Por que Zod?

- Valida `env`, requests e responses.
- Gera contratos claros no codigo.
- Reduz bugs causados por payloads ambiguos.

### Por que Drizzle?

- Tipagem forte.
- SQL explicito e controlado.
- Boa compatibilidade com PostgreSQL/Supabase.
- Menos abstrato que Prisma para cenarios com RLS e SQL customizado.

## Estrutura Inicial Recomendada

```text
backend-new/
  src/
    main.ts
    app.ts

    config/
      env.ts
      cors.ts

    infra/
      database/
        db.ts
        rls.ts
        migrations/
      auth/
        supabase-auth.gateway.ts
      logger/
        logger.ts
      storage/
        storage.gateway.ts

    modules/
      auth/
        auth.routes.ts
        auth.controller.ts
        auth.service.ts
        auth.repository.ts
        auth.schemas.ts
        auth.types.ts

      tenants/
        tenants.routes.ts
        tenants.controller.ts
        tenants.service.ts
        tenants.repository.ts
        tenants.schemas.ts
        tenants.types.ts

      clientes/
      transacoes/
      recompensas/
      resgates/
      dashboard/
      configuracoes/
      auditoria/
      public/

    shared/
      errors/
        app-error.ts
        error-handler.ts
      http/
        response.ts
      security/
        require-auth.ts
        require-role.ts
      tenant/
        tenant-context.ts
      validation/
      time/
      types/

  tests/
    unit/
    integration/

  scripts/
    migrate.ts
    seed.ts

  .env.example
  package.json
  tsconfig.json
  eslint.config.mjs
```

## Scripts Esperados

O `package.json` deve expor pelo menos:

```json
{
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "npm run typecheck && npm run lint && npm run test && npm run build"
  }
}
```

## Configuracao de Ambiente

Criar `src/config/env.ts` usando Zod. A aplicacao deve falhar no boot se variaveis obrigatorias estiverem ausentes.

Exemplo de `.env.example`:

```env
NODE_ENV=development
PORT=4001
LOG_LEVEL=debug

DATABASE_URL=
APP_DATABASE_URL=

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3004
FRONTEND_URL=http://localhost:3000
```

Decisoes importantes:

- `DATABASE_URL`: uso administrativo/migrations.
- `APP_DATABASE_URL`: usuario restrito da aplicacao, preferencialmente com RLS.
- `SUPABASE_SERVICE_ROLE_KEY`: somente em gateways backend.
- `SUPABASE_JWT_SECRET`: se validarmos JWT localmente.
- `ALLOWED_ORIGINS`: lista explicita por ambiente.

## Autenticacao e Autorizacao

Criar uma camada propria de autenticacao:

```text
infra/auth/supabase-auth.gateway.ts
shared/security/require-auth.ts
shared/security/require-role.ts
shared/tenant/tenant-context.ts
```

Regras:

- O middleware de auth deve validar token e montar um `AuthenticatedUser`.
- O `TenantContext` deve ser obrigatorio para rotas autenticadas.
- `requireRole` deve receber papeis permitidos.
- Services nao devem depender diretamente de `Request` do Fastify.

Formato sugerido:

```ts
type AuthenticatedUser = {
  authUserId: string
  tenantUserId: string
  tenantId: string
  role: "admin" | "operador"
  email?: string
}
```

## Multi-Tenant e RLS

O backend novo deve nascer multi-tenant, nao adaptar isso depois.

Diretrizes:

- Toda tabela de negocio deve ter `tenant_id`, quando aplicavel.
- Toda query autenticada deve receber `tenantId`.
- Repositories devem exigir tenant explicitamente.
- RLS deve ser configurado de modo centralizado.
- Evitar SQL espalhado configurando claims manualmente em varios lugares.

Para Postgres/Supabase, preferir uma funcao central:

```ts
withTenantTransaction(tenantContext, async (tx) => {
  // queries
})
```

Ao configurar claims, preferir `set_config` parametrizado em vez de interpolacao manual de string.

## Erros e Respostas

Criar erro base:

```text
shared/errors/app-error.ts
shared/errors/error-handler.ts
```

Todo erro conhecido deve virar resposta padronizada:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Payload invalido."
  }
}
```

Evitar `console.error` espalhado. Usar logger estruturado.

## Logging

Usar Pino.

Requisitos:

- Log estruturado JSON em producao.
- Log legivel em desenvolvimento com `pino-pretty`.
- Nunca logar senha, token, service role key, CPF completo sem criterio ou payload sensivel.
- Incluir request id.

## Testes

Comecar com:

```text
tests/unit/
tests/integration/
```

Testes obrigatorios por modulo:

- schemas validam payloads.
- services validam regras de negocio.
- repositories respeitam tenant.
- rotas retornam erros padronizados.

Testes de integracao obrigatorios:

- isolamento entre tenants.
- auth sem token.
- auth com role insuficiente.
- operacoes de escrita com RLS.
- endpoints publicos nao vazam dados entre tenants.

## Coexistencia com Backend Legado

Durante a migracao:

```text
backend      -> http://localhost:3001
backend-new  -> http://localhost:4001
frontend-new -> consome rotas novas gradualmente
```

Em homologacao/producao, existem duas opcoes:

1. **Rotas versionadas**

```text
/api/v1/* -> backend legado
/api/v2/* -> backend-new
```

2. **Migracao por dominio**

```text
/dashboard/*  -> backend-new
/clientes/*   -> legado
/transacoes/* -> legado
```

Recomendacao: comecar por dominio, porque facilita trocar uma area funcional por vez.

## Ordem Recomendada de Migracao

1. `health`
   - Criar `/health`.
   - Validar boot, env, logger e pipeline.

2. `auth/me`
   - Validar token.
   - Resolver usuario autenticado.
   - Resolver tenant.

3. `dashboard`
   - Migrar endpoint de leitura.
   - Comparar resposta com backend legado.
   - Baixo risco porque nao escreve no banco.

4. `clientes`
   - Migrar leitura.
   - Depois cadastro/atualizacao.

5. `recompensas`
   - Migrar catalogo e CRUD.

6. `transacoes`
   - Migrar lancamento de pontos.
   - Requer testes fortes de consistencia.

7. `resgates`
   - Migrar FIFO e debitacao.
   - Requer testes de concorrencia/transacao.

8. `configuracoes`
   - Migrar settings de tenant.
   - Corrigir modelo de Storage/logo se existir.

9. `public`
   - Migrar consultas publicas.
   - Validar cuidadosamente escopo por tenant.

## Decisoes Arquiteturais a Tomar Agora

Antes de implementar funcionalidades, decidir:

1. **Framework**
   - Recomendado: Fastify.
   - Alternativa: NestJS, caso queira mais convencao e mais cerimonia.

2. **ORM/query builder**
   - Recomendado: Drizzle.
   - Alternativa: `pg` puro no inicio, com repositories bem tipados.

3. **Validacao**
   - Recomendado: Zod em env, request e response.

4. **Auth**
   - Continuar usando Supabase Auth inicialmente.
   - Isolar integracao em gateway.

5. **Banco**
   - Inicialmente usar o mesmo banco do legado.
   - Evitar migrations concorrentes sem governanca.
   - `backend-new` deve comecar lendo antes de escrever.

6. **RLS**
   - Manter RLS como camada de defesa.
   - Nao depender somente de RLS; repositories tambem devem filtrar por tenant.

7. **Contratos**
   - Padronizar responses antes de migrar muitas rotas.

## Primeira Fase de Implementacao

O Agente deve criar apenas a fundacao:

1. Criar pasta `backend-new/`.
2. Inicializar package TypeScript.
3. Configurar `tsconfig` com `strict: true`.
4. Instalar dependencias essenciais.
5. Criar estrutura de diretorios.
6. Criar `env.ts` com Zod.
7. Criar logger.
8. Criar app Fastify.
9. Criar `/health`.
10. Criar error handler global.
11. Criar scripts `dev`, `build`, `typecheck`, `lint`, `test`, `check`.
12. Rodar todos os checks.

Nao migrar regras de negocio nessa primeira fase.

## Criterios de Aceite da Fundacao

A fase inicial so deve ser considerada pronta quando:

- `npm run typecheck` passar.
- `npm run lint` passar.
- `npm run test` passar.
- `npm run build` passar.
- `/health` responder corretamente.
- `.env.example` estiver completo.
- Nao houver segredo hardcoded.
- A estrutura de diretorios estiver criada.
- Nenhuma alteracao no backend legado for necessaria.

## Recomendacao Final

Criar `backend-new` e migrar gradualmente e a abordagem recomendada.

O backend atual deve continuar funcionando como legado e referencia de comportamento. O `backend-new` deve ser tratado como a base definitiva para o produto SaaS profissional, com foco em arquitetura limpa, multi-tenant seguro, validacao forte, testes e evolucao sustentavel.
