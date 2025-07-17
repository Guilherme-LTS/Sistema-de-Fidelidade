// backend/index.js

// 1. Importações
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const { cpf: cpfValidator } = require('cpf-cnpj-validator'); // Adicione esta linha

// 2. Inicialização do App
const app = express();
const PORT = process.env.PORT || 3001; // Usa a porta do .env ou 3001 como padrão

// 3. Middlewares
app.use(cors()); // Permite que o frontend acesse a API
app.use(express.json()); // Permite que o express entenda requisições com corpo em JSON

// 4. Rota principal - POST /transacoes
app.post('/transacoes', async (req, res) => {
  let connection; // Declaramos a conexão aqui para que ela seja acessível no bloco finally
  try {
    const { cpf, valor } = req.body;

    // Validação simples de entrada
    if (!cpf || !valor || valor <= 0) {
      return res.status(400).json({ error: 'CPF e valor (maior que zero) são obrigatórios.' });
    }

    // Limpar o CPF removendo pontos e traços antes de validar e salvar
    const cpfLimpo = cpf.replace(/\D/g, '');

    // --- BLOCO DE VALIDAÇÃO DE CPF ---
    if (!cpfValidator.isValid(cpfLimpo)) {
      return res.status(400).json({ error: 'CPF inválido. Por favor, verifique os dados.' });
    }

    const pontosGanhos = Math.floor(valor); // 1 real = 1 ponto

    // Inicia uma transação com o banco de dados.
    // Isso garante que todas as operações (buscar, inserir, atualizar) aconteçam com sucesso, ou nenhuma delas acontece.
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Passo A: Verificar se o cliente existe
    let [clientes] = await connection.execute('SELECT * FROM clientes WHERE cpf = ?', [cpfLimpo]);
    let cliente = clientes[0];
    let clienteId;

    // Passo B: Se o cliente não existe, criar um novo
    if (!cliente) {
      console.log(`Cliente com CPF ${cpfLimpo} não encontrado. Criando novo cliente.`);
      const [resultado] = await connection.execute('INSERT INTO clientes (cpf, pontos_totais) VALUES (?, 0)', [cpfLimpo]);
      clienteId = resultado.insertId;
    } else {
      clienteId = cliente.id;
    }

    // Passo C: Inserir o registro na tabela de transações
    await connection.execute(
      'INSERT INTO transacoes (cliente_id, valor_gasto, pontos_ganhos) VALUES (?, ?, ?)',
      [clienteId, valor, pontosGanhos]
    );
    console.log(`Transação de R$${valor} registrada para o cliente ID ${clienteId}.`);

    // Passo D: Atualizar a pontuação total do cliente
    await connection.execute(
      'UPDATE clientes SET pontos_totais = pontos_totais + ? WHERE id = ?',
      [pontosGanhos, clienteId]
    );
    console.log(`Pontuação do cliente ID ${clienteId} atualizada.`);

    // Se tudo deu certo, "comita" as alterações no banco
    await connection.commit();

    res.status(201).json({ message: 'Transação registrada e pontos computados com sucesso!', pontosGanhos });

  } catch (error) {
    // Se algo deu errado, faz o "rollback" para desfazer qualquer alteração
    if (connection) await connection.rollback();
    console.error('Erro ao processar a transação:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor ao processar a transação.' });

  } finally {
    // Libera a conexão de volta para o pool, independentemente de sucesso ou falha
    if (connection) connection.release();
  }
});


// ROTA PARA CONSULTAR SALDO DE PONTOS
app.get('/clientes/:cpf', async (req, res) => {
  let connection;
  try {
    // 1. Pega o CPF dos parâmetros da URL
    const cpfParam = req.params.cpf.replace(/\D/g, ''); // Limpa o CPF de pontos e traços

    if (!cpfParam) {
      return res.status(400).json({ error: 'CPF é obrigatório.' });
    }

    connection = await db.getConnection();

    // 2. Busca o cliente no banco de dados
    const [clientes] = await connection.execute(
      'SELECT nome, cpf, pontos_totais FROM clientes WHERE cpf = ?',
      [cpfParam]
    );

    const cliente = clientes[0];

    // 3. Verifica se o cliente foi encontrado
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    // 4. Retorna os dados do cliente com sucesso
    res.status(200).json(cliente);

  } catch (error) {
    console.error('Erro ao consultar cliente:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor ao consultar o cliente.' });
  } finally {
    if (connection) connection.release();
  }
});




// 5. Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});