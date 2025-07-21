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

// --- CONFIGURAÇÃO DE SEGURANÇA CORS ---
// A sua lista de endereços que podem acessar a API
const allowedOrigins = [
  'http://localhost:3000',                  // Acesso para desenvolvimento local
  'https://sistema-fidelidade-flax.vercel.app' // Acesso para o seu site em produção
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem 'origin' (como Postman ou apps mobile)
    if (!origin) return callback(null, true);

    // Verifica se a origem da requisição está na nossa lista de permissões
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true); // Acesso permitido
    } else {
      callback(new Error('Acesso não permitido pela política de CORS')); // Acesso negado
    }
  }
};

// 3. Middlewares
app.use(cors(corsOptions)); // APLICA AS NOSSAS REGRAS DE CORS
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

// ROTA PARA BUSCAR RECOMPENSAS DISPONÍVEIS
app.get('/recompensas', async (req, res) => {
  try {
    const [recompensas] = await db.execute('SELECT * FROM recompensas WHERE ativo = true ORDER BY custo_pontos ASC');
    res.status(200).json(recompensas);
  } catch (error) {
    console.error('Erro ao buscar recompensas:', error);
    res.status(500).json({ error: 'Erro ao buscar recompensas.' });
  }
});


// ROTA PARA PROCESSAR O RESGATE DE UMA RECOMPENSA
app.post('/resgates', async (req, res) => {
  let connection;
  try {
    const { cpf, recompensa_id } = req.body;
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (!cpfLimpo || !recompensa_id) {
      return res.status(400).json({ error: 'CPF e ID da recompensa são obrigatórios.' });
    }

    connection = await db.getConnection();
    await connection.beginTransaction(); // Inicia a transação!

    // 1. Buscar dados do cliente
    const [clientes] = await connection.execute('SELECT * FROM clientes WHERE cpf = ? FOR UPDATE', [cpfLimpo]);
    const cliente = clientes[0];
    if (!cliente) {
      throw new Error('Cliente não encontrado.');
    }

    // 2. Buscar dados da recompensa
    const [recompensas] = await connection.execute('SELECT * FROM recompensas WHERE id = ?', [recompensa_id]);
    const recompensa = recompensas[0];
    if (!recompensa) {
      throw new Error('Recompensa não encontrada.');
    }

    // 3. VERIFICAR SE HÁ PONTOS SUFICIENTES
    if (cliente.pontos_totais < recompensa.custo_pontos) {
      throw new Error('Pontos insuficientes para resgatar esta recompensa.');
    }

    // 4. Se chegou até aqui, pode prosseguir: subtrair os pontos
    await connection.execute(
      'UPDATE clientes SET pontos_totais = pontos_totais - ? WHERE id = ?',
      [recompensa.custo_pontos, cliente.id]
    );

    // 5. Registrar na tabela de histórico de resgates
    await connection.execute(
      'INSERT INTO resgates (cliente_id, recompensa_id, pontos_gastos) VALUES (?, ?, ?)',
      [cliente.id, recompensa.id, recompensa.custo_pontos]
    );

    await connection.commit(); // Confirma a transação!

    const pontosRestantes = cliente.pontos_totais - recompensa.custo_pontos;
    res.status(200).json({ message: 'Recompensa resgatada com sucesso!', pontos_restantes: pontosRestantes });

  } catch (error) {
    if (connection) await connection.rollback(); // Desfaz tudo em caso de erro!
    console.error('Erro no resgate:', error);
    res.status(500).json({ error: error.message || 'Ocorreu um erro no servidor durante o resgate.' });
  } finally {
    if (connection) connection.release();
  }
});


// 5. Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});