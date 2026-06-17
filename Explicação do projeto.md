# Contexto Completo do Projeto --- Sistema de Fidelidade B2B Multi-Tenant {#contexto-completo-do-projeto-sistema-de-fidelidade-b2b-multi-tenant}

## O que é o projeto

Sistema de fidelidade B2B para restaurantes chamado **Fidelizi**. Restaurantes (tenants) se cadastram na plataforma e oferecem aos seus clientes finais um programa de acúmulo e resgate de pontos. Quanto mais o cliente consome, mais pontos acumula --- e com esses pontos resgata recompensas, criando um ciclo de engajamento contínuo.

## Stack tecnológica

- **Frontend:** React + TypeScript

- **Backend:** Node.js + Express

- **Banco de dados:** Supabase (PostgreSQL) com RLS ativo

- **Autenticação:** Supabase Auth com JWT

- **Deploy:** Vercel (frontend) + Render (backend)

## Arquitetura Multi-Tenant

Cada restaurante é um tenant identificado pelo UID gerado pelo Supabase Auth no momento do cadastro. Esse UID é usado como tenant_id em todas as tabelas do sistema para garantir isolamento total de dados entre restaurantes.

O isolamento é garantido por duas camadas:

1.  **RLS policies no Supabase** --- cada tabela tem policies que filtram por tenant_id do usuário autenticado.

2.  **Middleware no backend** --- valida o tenant do usuário autenticado antes de processar qualquer requisição.

## Modelo de dados principal

As tabelas centrais são:

- tenant_users: cadastro dos restaurantes (tenants)

- tenant_settings: configurações de cada tenant (prazo de carência, expiração de pontos etc.)

- customers: clientes dos restaurantes, identificados por CPF, com tenant_id vinculando ao restaurante

- transactions: lançamentos de pontos por cliente e tenant

- recompensas: prêmios cadastrados por cada tenant

- resgates: resgates de recompensas por cliente

- audit_logs: registro de todos os eventos do sistema por tenant

- restaurant_users: funcionários/operadores de cada restaurante, sem vínculo com auth.users

## Personas do sistema

- **Admin/Operador do restaurante:** acessa o dashboard em /dashboard após login via Supabase Auth.

- **Cliente do restaurante:** acessa /meus-pontos sem login, consulta seus pontos informando o CPF e selecionando o restaurante.

## Páginas implementadas

- /dashboard: Visão geral com métricas, top clientes e atividade recente

- /clientes: Listagem e detalhes dos clientes do restaurante

- /operacoes: Lançamento de pontos e resgate de recompensas

- /premios: Cadastro e gestão de recompensas

- /usuarios: Gestão de funcionários/operadores do restaurante

- /configuracoes: Configurações do tenant (carência, expiração etc.)

- /auditoria: Log de eventos do tenant com filtros

- /meus-pontos: Portal do cliente final para consulta de pontos por CPF

## Bugs ativos --- foco principal desta sessão {#bugs-ativos-foco-principal-desta-sessão}

Esses três bugs surgiram após alterações recentes de RLS e isolamento multi-tenant e ainda não foram resolvidos:

### Bug 1 --- POST /transacoes retorna 500 {#bug-1-post-transacoes-retorna-500}

- Ao lançar pontos para um cliente, o backend retorna 500 Internal Server Error.

- O erro provavelmente está na query de inserção ou em alguma validação que depende de uma coluna/tabela alterada nas últimas migrations.

### Bug 2 --- POST /resgates retorna 500 {#bug-2-post-resgates-retorna-500}

- Ao resgatar uma recompensa, o backend retorna 500 Internal Server Error.

- Mesma suspeita --- query ou validação quebrada pelas últimas alterações.

### Bug 3 --- /meus-pontos não exibe nenhum restaurante ao consultar por CPF {#bug-3-meus-pontos-não-exibe-nenhum-restaurante-ao-consultar-por-cpf}

- O cliente informa o CPF mas nenhum restaurante é exibido, mesmo com pontos existentes no banco.

- A mensagem exibida é: \"Você ainda não possui pontos em nenhum restaurante\".

- O saldo aparece corretamente no painel admin, então o dado existe --- o problema está na query ou no endpoint que alimenta essa página.

## Diretrizes de Resolução (Engenheiro de Software Sênior)

1.  **Leitura do repositório completo:** Analisar código do frontend, backend e variáveis de ambiente.

2.  **Inspeção do Banco de Dados:** Acessar o Supabase para verificar o estado atual das tabelas, migrations e RLS policies.

3.  **Análise de Logs:** Verificar os logs do backend para identificar a causa raiz específica dos erros 500.

4.  **Diagnóstico Individual:** Apresentar a causa raiz de cada bug separadamente antes de propor correções.

5.  **Correção Iterativa:** Corrigir um bug por vez, informando as alterações realizadas para validação antes de prosseguir.

**Nota:** Nenhuma alteração deve ser feita sem a apresentação prévia do diagnóstico completo e aprovação.
