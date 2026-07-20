# Due Diligence Técnica — Plataforma Pontus
**Repositório analisado:** `Guilherme-LTS/Sistema-de-Fidelidade`
**Data:** 20/07/2026
**Escopo:** Backend (Fastify + Drizzle + PostgreSQL/Supabase), Frontend (Next.js), Billing (Stripe), Infra (Render/Vercel/Cloudflare)

> Nota metodológica: esta auditoria foi feita lendo o código-fonte real do repositório (não apenas a documentação `.md` do projeto). Onde relevante, cito o arquivo exato. Não tenho acesso ao dashboard do Supabase, Render, Vercel, Cloudflare nem ao Stripe live — então tudo que depende de configuração externa (variáveis de ambiente reais, políticas de rede, DNS) é sinalizado como "não verificável remotamente" e devo ser conferido por você.

Primeira correção de expectativa: a descrição do projeto que você me passou diz "Vite + Express". O código real é **Next.js 15 (App Router) no frontend** e **Fastify no backend**, não Vite/Express. Isso não é um problema em si — Fastify é, se algo, uma escolha melhor que Express para uma API nova — mas é um sinal de que a documentação do projeto está desatualizada em relação ao código, o que por si só é um risco de due diligence (documentação que não reflete a arquitetura real atrapalha onboarding e decisões de investidor).

---

## 🔴 Crítico — resolver antes de aceitar o primeiro cliente pagante

### 1. Isolamento multi-tenant depende 100% de disciplina manual — a camada de RLS existe no banco mas não é usada pela aplicação

Este é o achado mais importante da auditoria.

**O que encontrei:**
- Existe um script (`backend/apply-rls.ts`) que cria políticas RLS reais no Postgres, do tipo `tenant_id = current_setting('app.current_tenant')`, em praticamente todas as tabelas sensíveis.
- Existe uma função pronta para usar essas políticas: `withTenantTransaction()` em `backend/src/infra/database/rls.ts`, que abre uma transação, seta `app.current_tenant` via `set_config`, e só então executa a query.
- Existe até um **segundo pool de conexão** (`appDb`, usando `APP_DATABASE_URL`) pensado especificamente para rodar com um role de banco mais restrito, que respeitaria RLS.
- **Nenhum dos 15 serviços/rotas do backend usa `appDb` ou `withTenantTransaction`.** Todos importam o `db` "administrativo" (pool com `DATABASE_URL`, tipicamente o role `postgres`/service role do Supabase, que **ignora RLS por padrão** por ser dono das tabelas).

Ou seja: vocês construíram uma segunda linha de defesa (RLS a nível de banco) e depois, na prática, nunca a conectaram. O isolamento entre tenants hoje depende inteiramente de cada desenvolvedor lembrar de escrever `WHERE tenant_id = ...` em toda query, em todo serviço, para sempre. Não existe uma rede de segurança que pegue um esquecimento.

**Impacto:** um único `WHERE` esquecido em uma query nova (ou em um endpoint futuro escrito sob pressão de prazo) expõe dados de um restaurante para outro — nomes de clientes, CPFs, saldo de pontos, faturamento. Isso é o tipo de incidente que vira notícia e processo no LGPD, não só um bug.

**Recomendação técnica:**
1. Decida conscientemente entre duas estratégias — não deixe as duas meio-implementadas como está hoje:
   - **(a)** Migrar todas as queries para passar por `withTenantTransaction`/`appDb`, com o role de banco do `APP_DATABASE_URL` de fato restrito e RLS como camada real de defesa; ou
   - **(b)** Assumir que a estratégia é "aplicação garante isolamento" e então **remover** a RLS/appDb do repo (para não passar falsa sensação de segurança) e investir em testes automatizados que garantam que toda query em tabela multi-tenant tem filtro de `tenant_id` (ex: lint customizado, ou um wrapper de query que exige tenant_id como parâmetro obrigatório).
2. Eu recomendaria (a): é o padrão usado por SaaS multi-tenant maduros (é literalmente o motivo de Supabase RLS existir), e vocês já pagaram o custo de projetar. Terminar de conectar é mais barato que os dois caminhos acima juntos.
3. Enquanto isso não é resolvido, um teste automatizado obrigatório no CI: para cada tabela com `tenant_id`, criar dois tenants de teste e para cada endpoint, tentar acessar/listar dados do tenant B autenticado como tenant A — deve sempre retornar vazio/403.

**Prioridade:** Crítico. Isso deveria bloquear a entrada em produção com clientes reais até estar resolvido ou até haver testes automatizados que cubram esse cenário exaustivamente.

---

### 2. Ambiente de produção usa `plan: free` no Render e o healthcheck aponta para uma rota que não existe

`render.yaml`:
```yaml
services:
  - type: web
    name: backend
    plan: free
    healthCheckPath: /
```

**Dois problemas concretos:**
- **`plan: free`**: instâncias free do Render hibernam após inatividade. O primeiro request depois de um período ocioso pode levar 30–60s para responder (cold start). Para uma API que atende operadores de balcão em farmácia/restaurante em horário de pico, isso significa "o sistema travou" na percepção do cliente pagante. Não há SLA nesse plano.
- **`healthCheckPath: /`**: o backend (`app.ts`) só registra `/health`, não `/`. Uma requisição a `/` provavelmente cai no handler 404 padrão do Fastify. Se o Render usa esse healthcheck para decidir se a instância está saudável e reiniciar/rotear tráfego, isso pode causar reinícios ou marcação de "unhealthy" mesmo com o backend 100% funcional.

**Recomendação:** subir para um plano pago do Render (ou Railway/Fly.io) antes do go-live, e corrigir `healthCheckPath` para `/health`. Isso é literalmente 5 minutos de trabalho e evita o cenário clássico de "acordar às 3 da manhã porque o serviço reiniciou sozinho".

**Prioridade:** Crítico e trivial de corrigir — não há razão para não resolver hoje.

---

### 3. Dezenas de scripts ad-hoc de alteração de schema fora do sistema de migrations

Na raiz de `backend/` encontrei 20 scripts do tipo `add-columns.ts`, `fix-db.ts`, `fix-db-2.ts`, `fix-db-3.ts`, `alter_db.js`, `alter_db2.js`, `migrate-architecture.ts`, `migrate-phase2.ts`, `add-stripe-columns.ts`, etc. — todos scripts avulsos que presumivelmente rodaram `ALTER TABLE` direto contra o banco.

Ao mesmo tempo, o diretório oficial de migrations do Drizzle (`backend/drizzle/`) só tem **4 migrations** (`0000` a `0003`).

**Por que isso é grave:** isso significa que o schema real de produção não é 100% reconstruível a partir do histórico de migrations versionado. Se vocês precisarem recriar o banco do zero (novo ambiente de staging, disaster recovery, ou uma branch de teste), `drizzle migrate` sozinho **não vai produzir o schema atual** — porque `fix-db.ts`, `fix-db-2.ts`, `fix-db-3.ts` (o nome já denuncia: são correções emergenciais aplicadas manualmente) não estão capturadas como migration formal.

Isso também explica por que existem nomes como `add-lgpd-and-regulation-columns.ts` soltos — mudanças de schema relacionadas a LGPD deveriam estar no histórico de migrations rastreável, não em um script solto que alguém rodou uma vez.

**Recomendação técnica:**
1. Rodar `drizzle-kit introspect` (ou equivalente) contra o banco de produção atual e gerar uma migration "baseline" que capture o estado real, arquivando os scripts `fix-db-*`/`alter_db*` fora do diretório de execução (mover para `backend/_scripts_historicos/` com um README explicando o que cada um fez, para preservar o histórico sem confundir com o fluxo ativo).
2. A partir de agora, **proibir** `ALTER TABLE` fora de `drizzle-kit generate` + migration versionada. Isso vale mesmo para hotfixes de emergência — pode gerar a migration depois, mas ela precisa existir.
3. Isso conecta diretamente com a política que você já adotou recentemente no trabalho da Luna (branch obrigatória do Supabase antes de qualquer DDL) — a mesma disciplina deveria valer aqui.

**Prioridade:** Crítico antes de escalar — hoje ainda é gerenciável porque o time é pequeno e lembra o que cada script fez; em 6 meses isso vira uma bomba-relógio de "ninguém sabe mais como recriar o schema do zero".

---

### 4. Verificação de certificado SSL desabilitada na conexão com o banco em produção

`backend/src/infra/database/db.ts`:
```ts
ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
```

`rejectUnauthorized: false` desliga a validação do certificado do servidor Postgres. Isso é um padrão comum "gambiarra que funciona" para contornar erros de certificado self-signed do provedor, mas tecnicamente abre a porta para um ataque man-in-the-middle na conexão com o banco — quem estiver na rota de rede poderia se passar pelo Postgres.

**Recomendação:** baixar o certificado CA correto do Supabase e usar `ssl: { rejectUnauthorized: true, ca: <certificado> }`. É raro isso ser explorado na prática (exige acesso à rede entre Render e Supabase), mas é uma correção de baixo custo que qualquer auditor de segurança vai marcar imediatamente — e para due diligence de investidor, é o tipo de item que pesa desproporcionalmente ao esforço de corrigir.

**Prioridade:** Crítico do ponto de vista de "isso nunca deveria estar assim em produção", mesmo com risco prático baixo.

---

## 🟠 Importante — resolver nas próximas sprints

### 5. Nenhum pipeline de CI configurado

Não encontrei `.github/workflows` nem qualquer outro CI (CircleCI, GitLab CI etc.) no repositório. Existem testes (`backend/tests`, comando `npm run check` que roda typecheck + lint + test + build), mas **nada garante que rodam antes de um merge/deploy**. Isso significa que hoje a única coisa impedindo um `console.log` de debug, um teste quebrado, ou um erro de tipo de ir para produção é a disciplina manual de quem está fazendo o deploy.

**Recomendação:** GitHub Actions rodando `npm run check` no backend e `pnpm check` no frontend a cada PR, bloqueando merge se falhar. Isso é rápido de configurar (menos de uma sprint) e é o tipo de proteção que compensa dramaticamente o investimento assim que o time crescer além de uma pessoa.

### 6. Rate limit único e global (100 req/min) — sem proteção adicional em rotas sensíveis

`app.ts` registra `@fastify/rate-limit` com `max: 100, timeWindow: "1 minute"` globalmente. Isso é melhor que nada, mas rotas de autenticação (`/auth/login`, se existir fluxo de senha, ou reset de senha) deveriam ter um limite mais agressivo e específico — 100 tentativas por minuto é suficiente para um ataque de força bruta contra uma conta específica se o rate limit for por IP e o atacante rotacionar IPs, ou mesmo sem rotacionar (100 tentativas de senha por minuto já é bastante).

**Recomendação:** rate limit dedicado e mais restritivo (ex: 5–10/min) em endpoints de login e recuperação de senha, idealmente por combinação IP+email para não permitir brute force distribuído.

### 7. `CORS` com `origin: true` (reflete qualquer origem) quando `ALLOWED_ORIGINS` contém `"*"`, combinado com `credentials: true`

`config/cors.ts`:
```ts
origin: env.ALLOWED_ORIGINS.includes("*") ? true : env.ALLOWED_ORIGINS,
credentials: true,
```

Isso não é necessariamente um bug hoje — depende inteiramente do valor real de `ALLOWED_ORIGINS` em produção, que eu não tenho como verificar. Mas o código *permite* que, se alguém em algum momento colocar `*` nessa env var (achando que "libera geral" é mais simples), o `@fastify/cors` passa a refletir a origem da requisição com `credentials: true` — que é a combinação clássica que permite qualquer site de terceiros fazer requisições autenticadas (com cookies/tokens) contra sua API em nome do usuário.

**Recomendação:** remover a possibilidade de wildcard nesse trecho de código (nunca permitir `*` quando `credentials: true`), e validar no `env.ts` (zod) que `ALLOWED_ORIGINS` é sempre uma lista explícita de domínios em produção.

### 8. `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` são opcionais no schema de env

`env.ts` marca as duas como `.optional()`. Isso significa que o backend sobe normalmente em produção mesmo sem Stripe configurado — o app não vai falhar no boot, vai falhar silenciosamente na primeira tentativa de checkout ou, pior, no processamento de um webhook (rejeitando a assinatura por falta de secret, e o Stripe vai ficar reenviando/marcando o endpoint como falho sem ninguém perceber até um cliente reclamar de cobrança).

**Recomendação:** tornar obrigatórias quando `NODE_ENV=production` (dá para fazer isso com `.refine()` no schema zod), para que o processo simplesmente não suba se billing estiver mal configurado — falhar rápido no deploy é sempre preferível a falhar silenciosamente em produção.

### 9. Falta filtro redundante de `tenant_id` em algumas queries de leitura de extrato

Em `clientes.service.ts`, método `consultarSaldo`, as queries de `redemptions` e `expirations` filtram apenas por `customer_id`, sem repetir `tenant_id`:
```sql
SELECT r.id, r.created_at, r.points_spent, rew.name as reward_name
FROM redemptions r JOIN rewards rew ON r.reward_id = rew.id
WHERE r.customer_id = ${cliente.id}
```
Hoje isso não é uma falha de isolamento — `cliente.id` já vem de uma busca previamente filtrada por tenant (`buscarPorCpf`), e pelo desenho do schema (`customers` tem `UNIQUE(tenant_id, consumer_profile_id)`), cada `customer.id` já pertence a um único tenant. Mas é uma dependência implícita e silenciosa: se algum dia `customer.id` deixar de ser exclusivo de um tenant (ex: em uma refatoração futura), essas duas queries ficam vulneráveis sem que ninguém perceba, porque não há um `AND tenant_id = ...` explícito de defesa em profundidade.

**Recomendação:** adicionar `AND tenant_id = ${tenantId}` mesmo sendo redundante hoje — é uma prática de defesa em profundidade barata que se conecta diretamente ao item 🔴1 (já que não há RLS pegando isso automaticamente).

### 10. Pool de conexão duplo (`db` e `appDb`) apontando, na prática, para o mesmo lugar

Como consequência do item 🔴1, `APP_DATABASE_URL` existe no schema de env como obrigatório, mas se ele hoje aponta para o mesmo usuário/role que `DATABASE_URL` (o que é bem provável, já que nada usa `appDb`), essa distinção é só aparência. Vale confirmar diretamente no Supabase se de fato existe um role separado configurado, ou se é a mesma connection string duplicada — se for a segunda opção, isso é outra evidência de que a arquitetura RLS foi desenhada mas nunca terminada.

---

## 🟡 Melhorias arquiteturais — não bloqueantes

### 11. Scripts de manutenção/debug misturados no código de produção do backend

Além dos scripts de schema já citados no item 🔴3, a raiz de `backend/` tem arquivos como `test-nan.ts`, `test-isolated-delete.ts`, `test-fastify-null.ts`, `test-delete.ts`, `test-delete-route.ts`, `query_db.js`, `list_tables.ts` — claramente scripts de debug pontual que ficaram no repositório. Não é grave, mas é ruído: dificulta a leitura do repositório por alguém novo (ou por um investidor/auditor fazendo due diligence), e aumenta a chance de alguém rodar um script desses achando que é parte do fluxo normal.

**Recomendação:** mover tudo isso para uma pasta `scripts/debug/` fora do path de build/deploy, ou simplesmente remover o que não tem mais utilidade, mantendo só o que é reutilizável (ex: `seed-test-customers.ts`, que já está corretamente em `src/scripts/`).

### 12. Modelo de dados: `consumer_profiles` global por CPF é uma decisão de design que vale documentar explicitamente

O sistema tem um conceito interessante: `consumer_profiles` (perfil global por CPF, cross-tenant) e `customers` (vínculo tenant-específico com esse perfil). Isso permite que um mesmo cliente final (CPF) tenha uma "identidade" compartilhada entre diferentes estabelecimentos, mas pontos/saldo isolados por tenant. É uma decisão arquitetural válida e até elegante para o caso de uso (fidelidade cross-merchant), mas tem implicações de LGPD que merecem estar documentadas explicitamente: um CPF cadastrado em um tenant "existe" globalmente e pode ser descoberto por outro tenant via busca (`buscarPerfilGlobalPorCpf`), mesmo que o outro tenant não veja o saldo/histórico. Vale garantir que isso está coberto na política de privacidade e que o consentimento LGPD capturado é por vínculo (tenant+cliente), não global — o código sugere que sim (`consentOperatorId`, `lgpdConsent` por perfil), mas o texto de consentimento apresentado ao cliente final deveria deixar claro que o cadastro "existe" de forma limitada fora daquele estabelecimento.

### 13. Sem paginação/streaming visível em relatórios de auditoria e dashboard para grandes volumes

Não revisei `dashboard.service.ts` e `auditoria.service.ts` em profundidade linha a linha, mas dado o padrão observado em `clientes.service.ts` (que pagina corretamente com `limit`/`offset`), vale garantir que os relatórios agregados do dashboard (totais, gráficos) não fazem full scan de tabelas como `transactions` sem filtro de data — com "milhões de lançamentos de pontos" (seu cenário de 500k clientes), qualquer agregação sem índice composto `(tenant_id, created_at)` vai degradar visivelmente. Recomendo revisão específica dessas duas rotas com `EXPLAIN ANALYZE` antes de escalar.

### 14. Considerar mover de `pg`/Drizzle com pool próprio para PgBouncer/Supabase Pooler explicitamente no connection string, se ainda não estiver

Não é possível confirmar remotamente se `DATABASE_URL`/`APP_DATABASE_URL` já usam o pooler do Supabase (Supavisor) ou uma conexão direta. Você já teve esse exato problema no Pontus anteriormente (erros de connection string do Supavisor documentados no seu histórico) — vale só confirmar que isso está resolvido e que o pool do `pg` no backend (`new Pool(...)`) não está competindo por conexões diretas com o limite baixo do Postgres do Supabase, especialmente sob picos de tráfego.

---

## 🟢 Pontos muito bem implementados

Para ser justo e transparente (você pediu isso explicitamente): várias partes do sistema estão em um nível de maturidade bem acima do que eu normalmente vejo em SaaS pré-produção.

- **Webhook do Stripe (`billing.routes.ts`) está muito bem feito.** Idempotência real via tabela `stripe_webhook_events` com constraint única tratando erro `23505`; proteção contra eventos fora de ordem comparando `event.created` contra `stripeSubscriptionLastEventAt`; lock de linha (`FOR UPDATE`) no tenant antes de aplicar mudança de status, evitando race condition entre dois webhooks concorrentes; deduplicação ativa de assinaturas duplicadas cancelando a nova automaticamente. Isso cobre exatamente as armadilhas clássicas de integração Stripe (webhooks fora de ordem, duplicados, concorrentes) que a maioria dos times só descobre depois de um incidente real.
- **Captura de raw body escopada corretamente por rota dentro do plugin**, sem quebrar o parsing JSON normal das outras rotas de billing (`/checkout`, `/portal`) — solução elegante para o problema clássico de "o parser global de JSON destrói a assinatura do webhook".
- **Validação de ambiente com Zod** (`env.ts`) falhando o boot do processo se variáveis obrigatórias estiverem ausentes — evita a categoria inteira de bug "esqueci de configurar uma env var e só descobri em produção".
- **Lock pessimista (`FOR UPDATE`) no cadastro de cliente** (`clientes.service.ts`) para evitar condição de corrida em cadastros simultâneos do mesmo CPF — mostra que a equipe já pensa em concorrência, não só em "caminho feliz".
- **Autenticação multi-tenant bem desenhada:** `requireAuth` resolve o tenant a partir de uma query no banco vinculada ao `userId` do JWT validado, não confia cegamente no header `x-tenant-id` (ele só desempata quando o usuário pertence a múltiplos tenants) — isso evita o erro comum de "tenant id vindo de header controlado pelo cliente define os dados retornados".
- **Organização do frontend por `features/`** com App Router e route groups (`(admin)`, `(consumer)`, `(auth)`, `(public)`) é uma estrutura moderna e escalável, alinhada com o que times React maduros adotam hoje — mais fácil de escalar em número de desenvolvedores do que uma estrutura por tipo de arquivo.
- **Helmet + rate limit + CORS configurado desde o boot da aplicação**, não como afterthought.
- **Separação de domínios (landing/app/api)** já feita, o que facilita cache/CDN diferenciado no Cloudflare e reduz superfície de CORS entre landing e app.

---

## Resposta direta às suas perguntas centrais

**"A arquitetura atual suporta 5.000 restaurantes, 500.000 clientes e milhões de lançamentos de pontos?"**
Estruturalmente, o modelo de dados (tenant_id em todas as tabelas relevantes, perfil global separado do vínculo por tenant) é compatível com essa escala. O que **não** está pronto para essa escala hoje é: (1) o plano free do Render, que não aguenta tráfego de produção real, nem hiberna graciosamente; (2) a ausência de RLS efetivamente ativa como rede de segurança quando o número de desenvolvedores/endpoints crescer; (3) falta de confirmação de índices compostos `(tenant_id, created_at)` nas tabelas de maior volume (`transactions`, `redemptions`, `expirations`) para os relatórios de dashboard não degradarem.

**"O que pode acordar a equipe às 3 da manhã?"**
Por ordem de probabilidade: (1) o Render free hibernando/reiniciando o backend sob carga real; (2) um deploy que introduz uma query sem filtro de tenant, vazando dados — sem RLS pra pegar isso automaticamente, só será descoberto quando um cliente perceber e reclamar; (3) o webhook do Stripe falhando silenciosamente por `STRIPE_WEBHOOK_SECRET` mal configurado em algum redeploy.

**"A arquitetura está madura para produção?"**
Não incondicionalmente — mas está mais perto do que a média dos projetos que chegam nesse estágio. Os itens 🔴1 e 🔴2 são bloqueantes reais e ambos têm correção viável em dias, não meses (o 🔴2 é literalmente uma linha de config; o 🔴1 é o único item que exige trabalho de verdade, mas o alicerce — RLS, pool separado, função `withTenantTransaction` — já existe, só falta conectar). Os demais itens 🔴 e 🟠 são do tipo que qualquer SaaS early-stage carrega; nenhum deles é sinal de arquitetura mal pensada — são sinais de arquitetura pensada mas não 100% terminada, o que é uma categoria de risco bem mais barata de resolver.

Se eu fosse o CTO recebendo isto para aprovar a entrada dos primeiros clientes pagantes amanhã: eu bloquearia só nos itens 🔴2 (5 minutos) e pediria pelo menos um teste automatizado de isolamento cross-tenant cobrindo os módulos de `clientes`, `transacoes` e `dashboard` antes de liberar (mesmo sem terminar a migração completa para RLS). O resto pode entrar como dívida técnica de sprint 1–2 pós-lançamento, documentada e com dono definido.
