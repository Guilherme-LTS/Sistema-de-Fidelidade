<div align="center">
  <img src="./logo-dark.png" alt="Pontus Logo" width="150" />
  <h1>Pontus</h1>
  <p><strong>A plataforma de fidelidade feita para quem tem restaurante, não para quem tem TI.</strong></p>
  
  [![Deploy (Frontend)](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](#)
  [![Deploy (Backend)](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render)](#)
  [![Banco de Dados](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase)](#)
</div>

---

## 📖 Sobre a Pontus

A **Pontus** é uma plataforma SaaS (Software as a Service) moderna, desenvolvida especificamente para digitalizar, automatizar e potencializar programas de fidelidade em restaurantes e estabelecimentos gastronômicos.

Nascida da necessidade de substituir antigos cartões de papel que molham, rasgam ou são perdidos, a Pontus permite que donos de restaurantes criem campanhas de pontos e recompensas em poucos cliques, proporcionando uma experiência de retenção moderna, rápida e intuitiva tanto para os clientes finais quanto para os operadores de caixa.

## 🚀 Problemas que Resolvemos

- **Fim do Papel:** Elimina custos recorrentes de impressão de cartões fidelidade de papel.
- **Prevenção de Fraudes:** Bloqueia a falsificação de carimbos e assinaturas falsas.
- **Inteligência de Dados:** Permite ao dono do restaurante conhecer de fato quem são os seus clientes mais fiéis, suas frequências e preferências.
- **Velocidade de Caixa:** Com uma interface altamente otimizada, o atendente pontua o cliente via CPF em menos de 3 segundos, não travando a fila de pagamento.
- **Comunicação Ativa:** Utiliza o e-mail do cliente para enviar notificações, extratos e novidades da loja (integração Resend).

## 🛠️ Stack Tecnológica

Arquitetura moderna, escalável e 100% pronta para a nuvem.

### Frontend
- **Next.js (App Router)** - Framework React para SSR e SSG.
- **TailwindCSS & Radix UI** - Estilização utilitária e componentes de acessibilidade.
- **React Hook Form & Zod** - Controle e validação de formulários.
- **TypeScript** - Tipagem estática para escalabilidade.

### Backend
- **Node.js & Fastify** - Servidor web de alta performance.
- **Drizzle ORM** - Interação fluida e tipada com o banco de dados.
- **PostgreSQL (Supabase)** - Banco de dados relacional robusto.
- **Supabase Auth** - Gestão segura de identidades e sessões.
- **Resend** - Infraestrutura de envio de e-mails transacionais.

## 🔮 Roadmap de Escala

À medida que a plataforma cresce, as seguintes evoluções arquiteturais e de negócio já estão mapeadas para as próximas versões:

- [ ] **Integração de Pagamentos (Stripe):** Integrar checkout automático para assinaturas mensais do SaaS e cobrança de lojistas.
- [ ] **Gestão de Billing:** Implementar controle de planos (Free, Pro, Enterprise), faturamento e gerenciamento de assinaturas dos restaurantes.
- [ ] **Rotinas de Backup:** Criar backups automáticos e diários (Point-in-Time Recovery) no Supabase.
- [ ] **Internacionalização (i18n):** Implementar suporte completo a múltiplos idiomas (Inglês, Espanhol), preparando a plataforma para expansão internacional.
- [ ] **Multi-currency & Multi-region:** Estruturar a arquitetura do banco para operação em múltiplos países, fuso-horários e conversões de diferentes moedas.
- [ ] **Observabilidade e Logs:** Otimizar logs estruturados do backend (Pino) para integração com Datadog, Grafana ou Elastic Stack.
- [ ] **Métricas Avançadas:** Implementar monitoramento ativo de APM (Application Performance Monitoring).
- [ ] **Alta Disponibilidade:** Evoluir a infraestrutura de backend para múltiplos containers balanceados (Load Balancing) visando o crescimento exponencial da plataforma.

## ⚖️ Licença

Este é um projeto proprietário (Closed Source). Todos os direitos reservados.
A cópia, modificação ou distribuição não autorizada deste código é estritamente proibida.

---
<div align="center">
  Desenvolvido com 💚 para transformar a relação entre restaurantes e seus clientes.
</div>
