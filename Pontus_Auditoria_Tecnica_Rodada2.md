# Due Diligence Técnica — Pontus (Rodada 2, pós-refatoração)
**Repositório:** `Guilherme-LTS/Sistema-de-Fidelidade` — estado atual (`git pull` feito agora, commit `d3bff90`)
**Contexto:** revisão de acompanhamento após a refatoração de Stripe, infra (Vercel/Render/Cloudflare/Supabase) e testes/CI descrita por você.

Antes de tudo: comparei o estado atual com o que documentei na auditoria anterior. Dois itens críticos que eu tinha levantado **foram corrigidos de verdade**:

- `render.yaml` agora está em `plan: starter` (saiu do free) e `healthCheckPath: /health` (antes apontava para `/`, rota inexistente). ✅ Resolvido.
- Os scripts soltos (`fix-db.ts`, `alter_db.js`, `test-*.ts` etc.) foram movidos para `backend/scripts/legacy_patches/`, saindo da raiz do projeto. ✅ Parcialmente resolvido — organização melhorou bastante; a ressalva abaixo (item 🟠 Pontos de Atenção #4) é sobre o que isso não resolve.

O item mais crítico da rodada anterior — **isolamento multi-tenant sem RLS de fato ativa** — segue não resolvido, e nesta rodada encontrei uma evidência ainda mais específica do problema: existe um teste chamado `rls.test.ts` que **dá falsa confiança** sobre isso estar coberto. Detalho abaixo.

---

## Problemas Críticos

### C1. O teste "RLS Isolation Integration" não testa RLS — testa o filtro manual de `WHERE`, e passaria mesmo com RLS completamente desligada

Arquivo: `backend/tests/integration/rls.test.ts`.

**O que o teste faz de fato:**
```ts
import { withTenantTransaction } from "../../src/infra/database/rls.js"; // importado, NUNCA usado
...
const res = await db.execute(
  sql`SELECT id, tenant_id FROM customers WHERE id IN (...) AND tenant_id = ${tenantA}`
);
```
O teste importa `withTenantTransaction` mas nunca o chama. Ele roda a query usando o `db` administrativo direto (mesmo pool usado por toda a aplicação), e o "isolamento" verificado é só o `AND tenant_id = ${tenantA}` escrito manualmente na própria query de teste — exatamente a mesma coisa que qualquer service do backend já faz. Isso não prova que RLS funciona; prova que `WHERE` funciona.

**Por que isso importa mais do que parecer um detalhe de teste:** o teste ativa `ALTER TABLE customers FORCE ROW LEVEL SECURITY` no `beforeAll`, o que parece rigoroso. Mas em Postgres, **superusuário sempre ignora RLS, independentemente de `FORCE ROW LEVEL SECURITY`** — essa flag só afeta o *dono da tabela* quando ele não é superusuário. Se a connection string usada em CI/produção (`DATABASE_URL`) é o usuário `postgres` do container de teste ou o service role do Supabase (que tipicamente é superusuário/bypassa RLS), a política nunca é avaliada de verdade — nem quando `app.current_tenant` está setado, nem quando não está. Ou seja: se algum dev remover a política RLS do banco inteiro amanhã, **esse teste continua passando**, porque ele nunca dependeu da política existir.

Isso é mais perigoso do que não ter teste nenhum: um teste com nome "RLS Isolation" que passa no CI cria a sensação — inclusive para investidores fazendo due diligence de código, e para vocês mesmos revisando cobertura — de que isolamento multi-tenant está coberto e validado. Não está.

**Causa raiz:** a mesma da rodada anterior — `withTenantTransaction`/`appDb` (o caminho que de fato setaria `app.current_tenant` e rodaria sob um role restrito) nunca foi conectado ao código de produção nem, agora, ao próprio teste que deveria validar isso.

**Impacto:** nenhuma mudança em relação à rodada anterior — continua sendo o cenário em que um único `WHERE` esquecido em um endpoint novo vaza dados entre tenants, sem qualquer rede de segurança em nível de banco.

**Recomendação específica e acionável:**
1. Reescrever `rls.test.ts` para de fato usar `withTenantTransaction(tenantA, ...)` chamando `appDb`, com a connection string de `APP_DATABASE_URL` configurada em CI apontando para um role **sem** `BYPASSRLS` e que não seja dono das tabelas (em CI isso significa criar esse role explicitamente no container Postgres do workflow, não só usar o `postgres` padrão). Só assim o teste testa o que o nome promete.
2. Um teste que deveria estar no lugar dele, mais direto: tentar rodar uma query **sem** nenhum filtro de tenant_id (simulando o bug que vocês querem prevenir) sob o contexto RLS de tenant A, e validar que zero linhas do tenant B aparecem — hoje nenhum teste faz isso.
3. Enquanto o ponto 1 não estiver pronto, eu renomearia o teste para algo como `tenant-filter-manual.test.ts`, para não gerar falsa sensação de segurança sobre RLS especificamente.

**Prioridade: P0.** Isso é mais urgente que na rodada passada, porque agora existe um artefato (o teste verde no CI) ativamente comunicando "isso está resolvido" quando não está.

---

### C2. CI roda testes, mas não roda lint nem typecheck no backend

`.github/workflows/ci.yml`, job `backend-check`:
```yaml
- run: cd backend && npx drizzle-kit push --force
- run: cd backend && npx vitest run
```
Só isso. O `package.json` do backend tem um script `check` (`typecheck && lint && test && build`) que existe exatamente para ser usado em CI, mas o workflow não o chama — chama só `vitest run` diretamente. Isso significa que um erro de tipo TypeScript, ou uma violação de lint (incluindo possíveis regras de segurança do ESLint, se houver), passa despercebido pelo CI mesmo com "tudo verde". O frontend está melhor (`pnpm build` do Next.js já faz type-check como parte do build), mas o backend não tem essa rede.

**Recomendação:** trocar o step por `npm run check` (ou adicionar steps explícitos de `npm run typecheck` e `npm run lint` antes do `vitest run` e do `tsc build`). Baixíssimo esforço, alto retorno — é literalmente trocar uma linha do YAML.

**Prioridade: P0** (mesma categoria de "5 minutos de trabalho, sem razão para não fazer agora").

---

### C3. Versão do Node no CI (20) diverge do `engines` declarado no `package.json` (>=22)

`ci.yml` usa `node-version: '20'` nos dois jobs; `backend/package.json` e `frontend/package.json` declaram `"engines": { "node": ">=22.0.0" }`. Isso significa que o CI está validando o código numa versão de runtime **diferente** da que vocês pretendem rodar em produção (Render/Vercel, presumivelmente Node 22, dado o `engines`). APIs novas do Node 22, comportamento de V8, ou uma dependência que exige >=22 podem passar no CI e quebrar em produção — ou o inverso, mais provável: algo que só existe no Node 22 falha silenciosamente no CI 20 sem ninguém perceber a diferença de versão.

**Recomendação:** alinhar `node-version: '22'` no workflow (e conferir que o runtime configurado no Render/Vercel também é 22.x), ou, se a decisão consciente for ficar em Node 20 por estabilidade, atualizar o `engines` para refletir isso. O importante é as três camadas (CI, `engines`, produção) dizerem a mesma versão — hoje elas não dizem.

**Prioridade: P0/P1** — barato de corrigir, mas o risco real (dependência que se comporta diferente entre versões) é baixo até que aconteça; ainda assim, é o tipo de inconsistência que uma due diligence séria sempre marca.

---

## Pontos de Atenção

### A1. Sincronização usa duas fontes de timestamp diferentes para decidir ordem de eventos — risco de *clock skew*

Em `stripe.service.ts`, `changePlan`, `cancelSubscription` e `resumeSubscription` gravam `stripeSubscriptionLastEventAt: Math.floor(Date.now() / 1000)` — hora do **seu servidor**. Já o webhook (`billing.routes.ts`) compara contra `event.created`, que é a hora **do lado da Stripe**. A proteção anti-fora-de-ordem depende de `event.created <= tenant.stripeSubscriptionLastEventAt`.

Isso funciona bem na maioria dos casos (a diferença entre os dois relógios costuma ser de milissegundos), mas é uma dependência implícita de que o relógio do seu servidor Render e o relógio da Stripe nunca divirjam por mais que a janela de latência normal. Se o relógio do servidor Render ficar minimamente adiantado (NTP falho, container com clock drift — acontece), um webhook legítimo e mais recente pode ser descartado como "fora de ordem" porque seu timestamp local ficou artificialmente à frente.

**Recomendação:** ao gravar `stripeSubscriptionLastEventAt` fora do fluxo de webhook (nos métodos diretos de `changePlan`/`cancelSubscription`/`resumeSubscription`), usar o timestamp retornado pela própria Stripe na resposta da API (ex: campo `current_period_start` da subscription, ou simplesmente não usar esse campo para essas mutações diretas — usar um campo separado, tipo `lastDirectMutationAt`, que não compita na mesma comparação que o webhook usa). Isso remove a dependência de sincronismo de relógio entre dois sistemas diferentes.

**Prioridade: P1.**

### A2. `syncCheckoutSession` não usa lock de linha (`FOR UPDATE`) nem atualiza `stripeSubscriptionLastEventAt`

Diferente de todos os outros pontos de escrita em `tenants` relacionados a assinatura (que usam `db.transaction` + `FOR UPDATE`), `syncCheckoutSession` faz um `update` direto sem lock e sem participar do mecanismo de ordenação por `stripeSubscriptionLastEventAt`. Na prática, o cenário de risco é: o usuário volta do Checkout do Stripe, o frontend chama `syncCheckoutSession` para resposta instantânea, e quase simultaneamente o webhook `customer.subscription.created` chega e processa em paralelo — sem lock, é tecnicamente possível (embora improvável, dado que ambos escrevem dados equivalentes) uma leitura suja entre as duas escritas concorrentes.

**Recomendação:** envolver `syncCheckoutSession` na mesma transação com `FOR UPDATE` usada nos outros métodos, por consistência e para fechar essa janela, mesmo sendo de baixo risco prático hoje.

**Prioridade: P2.**

### A3. `requireSubscription` não é aplicado nas rotas de `configuracoes`

Os módulos `clientes`, `recompensas`, `resgates`, `transacoes` e `usuarios` aplicam `requireSubscription` (bloqueia mutações de tenants sem assinatura ativa/trial válido, retornando 402). `configuracoes.routes.ts` não aplica. Pode ser intencional (ex: permitir que um tenant inadimplente ainda consiga acessar configurações para regularizar algo), mas vale confirmar que é uma decisão consciente e não um esquecimento — porque se não for intencional, é uma forma de um tenant sem pagamento em dia continuar fazendo mutações no sistema (ex: mudar regras do programa de fidelidade) sem passar pela trava de billing.

**Prioridade: P2** — só para confirmar intenção; se for esquecimento, é rápido de corrigir.

### A4. "Scripts legados" movidos, mas ainda residem dentro de `backend/` e nada impede novos scripts ad-hoc de reaparecerem

A reorganização para `backend/scripts/legacy_patches/` resolve o sintoma (raiz do repo mais limpa), mas o problema estrutural da rodada anterior — schema real de produção não 100% reconstruível a partir das migrations Drizzle versionadas — continua, porque os `ALTER TABLE` que esses scripts rodaram no passado nunca viraram migrations formais retroativamente. Isso não é urgente de corrigir agora (não é um risco ativo, é uma dívida histórica), mas vale para o roadmap.

**Prioridade: P2.**

---

## Pontos Bons

- **Idempotência e ordenação de webhooks continuam sólidas**, e agora com testes dedicados cobrindo isso de verdade (`billing-webhook-ordering.test.ts`, `billing-concurrency.test.ts`, `billing-customer-dedup.test.ts`, `billing-incomplete-handler.test.ts`) — diferente do `rls.test.ts`, esses parecem testar exatamente o que prometem (não abri os 4 arquivos linha a linha nesta rodada, mas os nomes e o tamanho — 100–200 linhas cada — indicam cenários reais, não smoke tests).
- **`createCheckoutSession` trata corretamente um caso de edge que a maioria dos times esquece**: assinaturas `incomplete` órfãs (checkout abandonado no meio) são canceladas automaticamente antes de permitir um novo checkout, evitando lixo acumulado na Stripe e conflito de "cliente já tem assinatura" quando na verdade é uma sessão morta.
- **Suporte a trial estendido no Checkout** (`subscription_data.trial_end` calculado a partir do trial local, respeitando a regra da Stripe de mínimo 48h no futuro) — trata corretamente o caso de alguém que já estava em trial local e decide adicionar cartão antes do fim do trial, sem cobrar imediatamente nem perder os dias restantes.
- **`changePlan` usa `proration_behavior: "none"` quando a assinatura está em trial** — evita cobrança de proration indevida ao trocar de plano mensal/anual ainda dentro do período grátis. Detalhe que a maioria das implementações de Stripe erra na primeira versão.
- **CI real existe agora**, com Postgres de serviço e testes de integração rodando contra banco real (não só mocks) — infraestrutura de teste é bem superior à média de um SaaS neste estágio.
- **`render.yaml` corrigido** confirma que o feedback da rodada anterior foi levado a sério e implementado corretamente, não só parcialmente.

---

## Pontos Excelentes

- A combinação de **lock pessimista (`FOR UPDATE`) + comparação de `event.created` para descartar eventos fora de ordem + tabela de idempotência com constraint única** no fluxo de webhook é, isoladamente, uma arquitetura de sincronização de billing no nível do que eu esperaria de um Stripe Verified Partner — é raro ver essa combinação completa e correta em SaaS pré-Series A.
- A separação `stripeSubscriptionLastEventAt` (controle de ordenação) vs `stripeBillingCachedDetails`/`stripeBillingLastSyncedAt` (invalidação de cache de exibição) mostra que o time já entende a diferença entre "estado autoritativo" e "cache derivado para performance" — isso é uma distinção que costuma só aparecer depois de um incidente real de cache desatualizado, e vocês já chegaram nela de forma proativa.

---

## Roadmap Técnico

**P0 (Crítico — antes de considerar a arquitetura "fechada")**
1. Reescrever `rls.test.ts` para efetivamente exercitar `withTenantTransaction`/`appDb` sob um role de banco sem bypass de RLS — hoje o teste não prova o que o nome diz (C1).
2. Trocar `npx vitest run` isolado no CI por `npm run check` (typecheck + lint + test + build) no job `backend-check` (C2).
3. Alinhar a versão do Node entre CI (`20`), `engines` (`>=22`) e o runtime real de produção — escolher uma e igualar as três (C3).
4. Decidir e executar, de uma vez: ou terminar de conectar RLS via `appDb` em todos os módulos (recomendado, dado que a infraestrutura já existe), ou removê-la do repositório para não deixar uma falsa camada de segurança documentada mas inerte (carry-over da rodada 1, ainda em aberto).

**P1 (Alta)**
5. Separar a fonte de timestamp usada para ordenação de eventos de billing: não misturar `Date.now()` local com `event.created` da Stripe na mesma comparação (A1).
6. Adicionar `AND tenant_id = ...` redundante nas duas queries de `consultarSaldo` (`redemptions`, `expirations`) identificadas na rodada 1 — segue pendente.
7. Confirmar se `APP_DATABASE_URL` hoje aponta para um role de fato distinto/restrito no Supabase, ou se é uma duplicata do `DATABASE_URL` — isso destrava o item P0.4.

**P2 (Média)**
8. Envolver `syncCheckoutSession` em transação com `FOR UPDATE`, por consistência com o resto do módulo de billing (A2).
9. Confirmar intencionalmente se `configuracoes` deve ou não exigir assinatura ativa para mutações (A3).
10. Gerar uma migration "baseline" formal capturando o schema real de produção, para não depender só do histórico informal em `legacy_patches/` (A4).

**P3 (Baixa)**
11. Revisar índices compostos `(tenant_id, created_at)` em `transactions`/`redemptions`/`expirations` com `EXPLAIN ANALYZE`, olhando especificamente para as queries de dashboard/relatório — ainda não verificado nesta rodada nem na anterior, recomendo como próximo foco de auditoria.
12. Confirmar `ALLOWED_ORIGINS` real em produção nunca contém `*` (carry-over da rodada 1) e considerar remover essa possibilidade no próprio código de `cors.ts`, não só por convenção de configuração.

---

## Resumo executivo

A refatoração avançou de forma real e verificável nos pontos de infraestrutura (Render corrigido) e de organização (scripts legados isolados), e o fluxo de billing continua — e em alguns aspectos ficou ainda mais robusto, com testes dedicados de concorrência e ordenação de webhook. Isso é trabalho sólido e não genérico.

O que ainda impede eu dizer "arquitetura fechada" é uma combinação específica: o problema estrutural de isolamento multi-tenant sem RLS ativa (identificado na rodada 1) continua aberto, e agora tem um teste que aparenta cobri-lo sem de fato cobrir — o que é um risco maior do que a ausência de teste, porque cria confiança falsa em uma auditoria futura menos cuidadosa (inclusive por parte de um investidor técnico lendo só o relatório de cobertura de testes, sem ler o código do teste). Resolver C1 e C2 é trabalho de baixas horas; resolver de vez o item P0.4 (RLS ponta a ponta) é o único item desta lista que exige um esforço de verdade — mas a base já está construída, falta conectar.
