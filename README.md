


# Sistema de Fidelidade para Restaurantes V.2.4

Um sistema de fidelidade full-stack desenvolvido para digitalizar e automatizar o programa de pontos de um restaurante familiar. O projeto transforma um processo manual em uma aplicação web rápida, intuitiva e escalável.

[Demonstração do Sistema](https://sistema-fidelidade-flax.vercel.app/)

![Demonstração do Sistema](https://cdn.discordapp.com/attachments/1012098738363318416/1406034876758491246/0812.gif?ex=68a0ff85&is=689fae05&hm=a7d9c0c28b89fc1b6ac605cea9597b690797a5a2ec94a20573f39c2240cf456f&)


---

## 📋 Índice

* [Sobre o Projeto](#-sobre-o-projeto)
* [✨ Funcionalidades](#-funcionalidades)
* [🛠️ Stack de Tecnologias](#-stack-de-tecnologias)
* [🚀 Começando (Setup Local)](#-começando-setup-local)
* [📄 Endpoints da API](#-endpoints-da-api)
* [☁️ Arquitetura de Deploy](#-arquitetura-de-deploy)
* [🔮 Melhorias Futuras](#-melhorias-futuras)
* [⚖️ Licença](#-licença)

---

## 📖 Sobre o Projeto

Este projeto nasceu da necessidade real de modernizar o "boteco" de um familiar, cujo programa de fidelidade era inteiramente controlado em cadernos de papel. O objetivo foi criar uma solução prática e de baixo custo que pudesse ser utilizada no dia a dia do caixa, oferecendo uma forma ágil de recompensar os clientes fiéis.

A aplicação é dividida em um frontend (React) e um backend (Node.js/Express) e foi totalmente desenvolvida para rodar em um ambiente de nuvem, garantindo alta disponibilidade e escalabilidade.

---

## ✨ Funcionalidades

- **Lançamento de Pontos:** Cadastro de pontos para clientes através do CPF.
- **Criação Automática de Cliente:** Se o CPF não for encontrado, um novo cliente é criado automaticamente.
- **Consulta de Saldo:** Verificação em tempo real do saldo de pontos de qualquer cliente.
- **Resgate de Recompensas:** Interface para selecionar e resgatar prêmios, com débito automático dos pontos.
- **Validação de CPF:** O backend valida se o formato do CPF é matematicamente válido.
- **Notificações em Tempo Real:** Feedback visual instantâneo (toast) para o operador do caixa.

---

## 🛠️ Stack de Tecnologias

As seguintes ferramentas e tecnologias foram utilizadas na construção do projeto:

| Ferramenta | Descrição |
| --- | --- |
| **Frontend** | |
| `React.js` | Biblioteca para a construção da interface de usuário. |
| `react-toastify` | Para notificações (toasts) elegantes e informativas. |
| **Backend** | |
| `Node.js` | Ambiente de execução do servidor. |
| `Express.js` | Framework para a construção da API REST. |
| `PostgreSQL` | Banco de dados relacional para armazenamento dos dados. |
| `pg` | Driver de conexão entre Node.js e PostgreSQL. |
| `cors` | Middleware para habilitar a segurança de acesso à API. |
| **Cloud & DevOps** | |
| `Vercel` | Plataforma de deploy para o frontend. |
| `Render` | Plataforma de deploy para o backend. |
| `Supabase` | Plataforma que hospeda o banco de dados PostgreSQL. |
| `Git & GitHub`| Para versionamento de código e CI/CD. |

---

## 🚀 Começando (Setup Local)

Para rodar este projeto na sua máquina local, siga os passos abaixo.

### Pré-requisitos

* [Node.js](https://nodejs.org/en/) (versão 16 ou superior)
* [Git](https://git-scm.com/)
* Uma instância do [PostgreSQL](https://www.postgresql.org/download/) rodando localmente.

### Instalação

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/Guilherme-LTS/Sistema-de-Fidelidade.git
    cd Sistema-de-Fidelidade
    ```

2.  **Setup do Backend:**
    ```bash
    cd backend
    npm install
    ```
    * Crie um arquivo `.env` na pasta `backend` e configure suas variáveis de ambiente locais. Use o `.env.example` como modelo:
        ```env
        DB_HOST=localhost
        DB_PORT=5432
        DB_USER=seu_usuario_postgres
        DB_PASSWORD=sua_senha
        DB_NAME=fidelidade_db_local
        ```
    * Rode o servidor backend:
    ```bash
    npm run dev
    ```

3.  **Setup do Frontend:**
    ```bash
    cd ../frontend
    npm install
    ```
    * Crie um arquivo `.env` na pasta `frontend` com o seguinte conteúdo:
        ```env
        REACT_APP_API_URL=http://localhost:3001
        ```
    * Rode a aplicação React:
    ```bash
    npm start
    ```
4. **Setup do Banco de Dados:**
    * Crie um banco de dados no seu PostgreSQL local.
    * Execute os scripts SQL encontrados no `README.md` (ou crie um arquivo `schema.sql`) para criar as tabelas `clientes`, `transacoes`, `recompensas` e `resgates`.

---

## 📄 Endpoints da API

A API REST do backend possui os seguintes endpoints:

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/transacoes` | Registra uma nova transação e atribui pontos a um cliente. |
| `GET` | `/clientes/:cpf` | Consulta os dados e o saldo de pontos de um cliente específico. |
| `GET` | `/recompensas` | Retorna a lista de todas as recompensas ativas. |
| `POST`| `/resgates` | Processa o resgate de uma recompensa para um cliente. |

---

## ☁️ Arquitetura de Deploy

A aplicação está totalmente na nuvem com a seguinte arquitetura:

* O **Frontend (React)** é servido pela **Vercel**, otimizado para performance e com deploy contínuo a cada `git push`.
* O **Backend (Node.js)** roda em um serviço web no **Render**, que também faz deploy contínuo.
* O **Banco de Dados (PostgreSQL)** é hospedado de forma segura no **Supabase**.

Essa arquitetura garante que a aplicação seja escalável, segura e resiliente.

---

## 🔮 Melhorias Futuras

O projeto está funcional, mas há planos para evoluí-lo:

- [ ] **Sistema de Login:** Autenticação para administradores e talvez para clientes consultarem seus próprios pontos.
- [ ] **Dashboard Analítico:** Um painel para o dono do estabelecimento com gráficos e dados sobre os clientes mais engajados e as recompensas mais populares.
- [ ] **Integração com API Fiscal:** Estudar a viabilidade de integrar com APIs da Receita Federal para capturar dados da nota fiscal (CPF e valor) automaticamente via QR Code, eliminando a digitação manual.

---

## ⚖️ Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

Feito por **Guilherme L. T. Silva**

[<img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" />](https://www.linkedin.com/in/guilherme-lucas-teixeira-silva/)
