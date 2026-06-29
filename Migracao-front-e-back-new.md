# Guia de Migracao Hibrida para a Nova Arquitetura

Este documento orienta a migracao das funcionalidades do sistema legado para as novas bases `frontend-new` e `backend-new`.

O objetivo e transformar o projeto em uma aplicacao SaaS moderna, escalavel, segura e facil de manter, sem quebrar o sistema atual durante o processo.

## Decisao Arquitetural

A abordagem recomendada e a **Migracao Hibrida**.

Isso significa:

- Migrar diretamente apenas codigo simples, isolado, bem testado e sem acoplamento com infraestrutura.
- Usar o sistema legado como referencia funcional para as regras de negocio existentes.
- Reimplementar do zero os pontos criticos da arquitetura, como APIs, autenticacao, autorizacao, multi-tenant, banco de dados, RLS, storage e configuracoes.
- Migrar as funcionalidades gradualmente, modulo por modulo.

Nao devemos copiar o backend legado em massa para o `backend-new`, pois isso levaria para a nova arquitetura os mesmos problemas estruturais que estamos tentando resolver.

Tambem nao devemos reescrever tudo sem olhar para o legado, pois existem regras de negocio, testes e comportamentos ja validados que devem ser preservados.

## Principio Geral

Use esta regra para decidir o que fazer com cada parte do sistema:

> Se o codigo for puro, pequeno, testavel e sem dependencia de HTTP, banco, Supabase, variaveis de ambiente ou contexto de tenant, ele pode ser migrado ou adaptado.
>
> Se o codigo mistura rota, regra de negocio, banco, autenticacao, autorizacao, auditoria ou configuracao, ele deve ser reimplementado na nova arquitetura.

## O Que Pode Ser Migrado Diretamente

Sao bons candidatos para migracao direta ou quase direta:

- Validadores puros.
- Funcoes utilitarias sem dependencia externa.
- Regras de calculo isoladas.
- Testes de dominio.
- Tipos compartilhados, desde que sejam revisados.
- Helpers sem dependencia de Express, Supabase, Pool, Request ou process.env.

Exemplos do legado que podem servir como base:

- Validador de CPF.
- Regras puras de pontos.
- Calculos relacionados a FIFO.
- Testes existentes de dominio.
- Helpers de agregacao do dashboard, desde que a camada de banco seja reescrita.

Esses codigos devem ser movidos para locais adequados na nova arquitetura, como:

```text
backend-new/src/shared/
backend-new/src/modules/<modulo>/domain/
backend-new/src/modules/<modulo>/application/
```

## O Que Deve Ser Refatorado Antes de Migrar

Alguns modulos possuem logica util, mas estao acoplados demais ao legado.

Esses modulos devem ser usados como referencia e refatorados antes de entrar no `backend-new`:

- Clientes.
- Transacoes.
- Resgates.
- Recompensas.
- Dashboard.
- Auth.

Para esses casos:

- Preserve o comportamento funcional.
- Reaproveite testes sempre que possivel.
- Extraia regras de negocio para use cases.
- Reescreva repositories e queries no padrao novo.
- Remova dependencia direta de `Request`, `Response`, `Pool`, `adminPool` e `process.env`.
- Valide entrada e saida com schemas, preferencialmente usando Zod.

## O Que Deve Ser Reconstruido do Zero

As partes abaixo devem ser reimplementadas completamente:

- Rotas publicas monoliticas.
- Configuracoes administrativas.
- Middleware de autenticacao legado.
- Autorizacao e controle de permissoes.
- Estrategia de multi-tenant.
- Estrategia de RLS.
- Configuracao de variaveis de ambiente.
- Inicializacao de banco de dados.
- Uploads, storage e politicas de acesso.
- Scripts soltos de migracao e manutencao.
- Arquivos legados grandes ou sem separacao clara de responsabilidades.

Esses pontos sao criticos para seguranca, escalabilidade e manutencao. Portanto, devem nascer corretamente na nova base.

## Padroes Que Nao Devem Ser Levados Para a Nova Arquitetura

Evitar levar para `backend-new`:

- Services recebendo `Request` ou `Response`.
- SQL inline dentro de rotas.
- Rotas com regra de negocio embutida.
- Acesso direto a `process.env` fora da camada de configuracao.
- Uso espalhado de `adminPool`.
- Fallbacks inseguros para chaves secretas.
- Tipagem fraca com `any` sem justificativa.
- `strict: false` no TypeScript.
- Arquivos `.js` legados misturados com TypeScript.
- Build artifacts como `dist` versionados no repositorio.
- Scripts manuais sem controle claro de migracao.
- Logica de tenant confiando apenas em headers enviados pelo cliente.

## Estrategia Para Coexistencia Temporaria

Durante a migracao, o sistema legado e o novo sistema devem coexistir.

Recomendacao:

- Manter o backend legado atendendo funcionalidades ja existentes.
- Rodar o `backend-new` em uma porta separada.
- Separar rotas por versao ou dominio:

```text
/api/v1/* -> backend legado
/api/v2/* -> backend-new
```

Ou, alternativamente:

```text
/api/clientes -> legado inicialmente
/api/dashboard -> backend-new quando migrado
```

O `frontend-new` pode consumir temporariamente os dois backends, desde que isso esteja centralizado em uma camada de API clara.

Evite chamadas diretas espalhadas por componentes.

## Ordem Recomendada de Migracao

### Fase 1 - Fundacao

Antes de migrar funcionalidades:

- Corrigir autenticacao real no `backend-new`.
- Remover qualquer usuario, tenant ou permissao mockada.
- Definir o modelo oficial de tenant context.
- Alinhar RLS com as policies reais do banco.
- Validar variaveis de ambiente por ambiente.
- Garantir que `.env`, `dist`, logs e artefatos nao sejam versionados.
- Definir padrao de modulo, use case, repository, schema e controller.

### Fase 2 - Migracao de Codigo Puro

Migrar primeiro:

- Validadores.
- Helpers puros.
- Regras de pontos.
- Calculos FIFO.
- Testes de dominio.

Essa fase reduz risco e cria uma base confiavel para os modulos seguintes.

### Fase 3 - Modulos de Leitura

Migrar funcionalidades com menor risco de impacto:

- Dashboard.
- Consultas simples de clientes.
- Configuracoes em modo leitura.

Esses modulos ajudam a validar arquitetura, autenticacao, tenant context e acesso ao banco sem afetar dados criticos.

### Fase 4 - Modulos de Escrita

Migrar depois:

- Clientes.
- Recompensas.
- Transacoes.
- Resgates.

Esses modulos exigem mais cuidado, pois alteram dados importantes do sistema.

Devem ter:

- Testes de use case.
- Testes de repository.
- Validacao de permissao.
- Validacao de tenant.
- Tratamento de erros.
- Auditoria quando necessario.

### Fase 5 - Modulos Criticos

Migrar por ultimo:

- Auth completo.
- Admin settings.
- Public endpoints.
- Uploads e storage.
- Politicas finais de acesso.

Essas areas devem ser migradas apenas quando a fundacao estiver estavel.

### Fase 6 - Desativacao do Legado

Quando um modulo estiver validado no `backend-new`:

- Redirecionar o frontend para consumir a nova API.
- Monitorar comportamento.
- Comparar respostas com o legado quando aplicavel.
- Remover dependencia do endpoint antigo.
- Documentar a migracao concluida.

## Estrutura Esperada Para Novos Modulos

Sugestao para cada modulo no `backend-new`:

```text
backend-new/src/modules/clientes/
├── application/
│   ├── create-cliente.use-case.ts
│   ├── list-clientes.use-case.ts
│   └── update-cliente.use-case.ts
├── domain/
│   ├── cliente.entity.ts
│   └── cliente.rules.ts
├── infra/
│   └── clientes.repository.ts
├── presentation/
│   ├── clientes.controller.ts
│   ├── clientes.routes.ts
│   └── clientes.schemas.ts
└── clientes.module.ts
```

Responsabilidades:

- `presentation`: HTTP, rotas, controllers e schemas de entrada/saida.
- `application`: casos de uso e orquestracao.
- `domain`: regras de negocio puras.
- `infra`: banco de dados, queries e integracoes externas.
- `module`: composicao do modulo.

## Criterios Para Considerar Um Modulo Migrado

Um modulo so deve ser considerado migrado quando:

- Possui contratos de entrada e saida definidos.
- Possui validacao de dados.
- Respeita tenant context.
- Nao depende de codigo legado.
- Possui testes minimos.
- Possui tratamento de erros padronizado.
- Nao acessa `process.env` diretamente.
- Nao usa mocks em ambiente real.
- Foi validado contra o comportamento esperado do sistema atual.

## Recomendacao Final

A estrategia recomendada e:

> Usar a abordagem hibrida, migrando diretamente apenas codigo puro e testes, enquanto APIs, banco, autenticacao, multi-tenant, RLS, storage e configuracoes devem ser reimplementados dentro da nova arquitetura.

Essa abordagem oferece o melhor equilibrio entre seguranca, velocidade e qualidade tecnica.

Ela evita carregar a divida tecnica do legado para o novo sistema, mas tambem preserva o conhecimento funcional ja existente.

O foco deve ser migrar por dominio, com validacao incremental, mantendo o sistema atual funcionando ate que cada parte esteja pronta para ser substituida.
