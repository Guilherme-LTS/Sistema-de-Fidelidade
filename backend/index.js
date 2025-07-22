// backend/index.js

// 1. Importações
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db'); // Nosso pool de conexão PostgreSQL
const { cpf: cpfValidator } = require('cpf-cnpj-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 2. Inicialização do App
const app = express();
const PORT = process.env.PORT || 3001;

// --- CONFIGURAÇÃO DE SEGURANÇA CORS ---
const allowedOrigins = [
  'http://localhost:3000',
  'https://sistema-fidelidade-flax.vercel.app'
];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Acesso não permitido pela política de CORS'));
    }
  }
};

// 3. Middlewares
app.use(cors(corsOptions));
app.use(express.json());

// 4. Rotas da API

// Rota principal - POST /transacoes
app.post('/transacoes', async (req, res) => {
  const client = await db.connect(); // Pega um cliente do pool
  try {
    const { cpf, valor } = req.body;
    if (!cpf || !valor || valor <= 0) {
      return res.status(400).json({ error: 'CPF e valor (maior que zero) são obrigatórios.' });
    }
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (!cpfValidator.isValid(cpfLimpo)) {
      return res.status(400).json({ error: 'CPF inválido. Por favor, verifique os dados.' });
    }
    const pontosGanhos = Math.floor(valor);

    await client.query('BEGIN'); // Inicia a transação

    let resCliente = await client.query('SELECT * FROM clientes WHERE cpf = $1', [cpfLimpo]);
    let cliente = resCliente.rows[0];
    let clienteId;

    if (!cliente) {
      const resNovoCliente = await client.query('INSERT INTO clientes (cpf, pontos_totais) VALUES ($1, 0) RETURNING id', [cpfLimpo]);
      clienteId = resNovoCliente.rows[0].id;
    } else {
      clienteId = cliente.id;
    }

    await client.query('INSERT INTO transacoes (cliente_id, valor_gasto, pontos_ganhos) VALUES ($1, $2, $3)', [clienteId, valor, pontosGanhos]);
    await client.query('UPDATE clientes SET pontos_totais = pontos_totais + $1 WHERE id = $2', [pontosGanhos, clienteId]);
    
    await client.query('COMMIT'); // Confirma a transação

    res.status(201).json({ message: 'Transação registrada e pontos computados com sucesso!', pontosGanhos });
  } catch (error) {
    await client.query('ROLLBACK'); // Desfaz tudo em caso de erro
    console.error('Erro ao processar a transação:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor ao processar a transação.' });
  } finally {
    client.release(); // Libera o cliente de volta para o pool
  }
});

// ROTA PARA CONSULTAR SALDO DE PONTOS
app.get('/clientes/:cpf', async (req, res) => {
  try {
    const cpfParam = req.params.cpf.replace(/\D/g, '');
    if (!cpfParam) {
      return res.status(400).json({ error: 'CPF é obrigatório.' });
    }
    const result = await db.query('SELECT nome, cpf, pontos_totais FROM clientes WHERE cpf = $1', [cpfParam]);
    const cliente = result.rows[0];

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    res.status(200).json(cliente);
  } catch (error) {
    console.error('Erro ao consultar cliente:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor ao consultar o cliente.' });
  }
});

// ROTA PARA BUSCAR RECOMPENSAS DISPONÍVEIS
app.get('/recompensas', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM recompensas WHERE ativo = true ORDER BY custo_pontos ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar recompensas:', error);
    res.status(500).json({ error: 'Erro ao buscar recompensas.' });
  }
});

// ROTA PARA PROCESSAR O RESGATE DE UMA RECOMPENSA
app.post('/resgates', async (req, res) => {
  const client = await db.connect();
  try {
    const { cpf, recompensa_id } = req.body;
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (!cpfLimpo || !recompensa_id) {
      return res.status(400).json({ error: 'CPF e ID da recompensa são obrigatórios.' });
    }
    await client.query('BEGIN');

    const resCliente = await client.query('SELECT * FROM clientes WHERE cpf = $1 FOR UPDATE', [cpfLimpo]);
    const cliente = resCliente.rows[0];
    if (!cliente) throw new Error('Cliente não encontrado.');

    const resRecompensa = await client.query('SELECT * FROM recompensas WHERE id = $1', [recompensa_id]);
    const recompensa = resRecompensa.rows[0];
    if (!recompensa) throw new Error('Recompensa não encontrada.');

    if (cliente.pontos_totais < recompensa.custo_pontos) {
      throw new Error('Pontos insuficientes para resgatar esta recompensa.');
    }

    await client.query('UPDATE clientes SET pontos_totais = pontos_totais - $1 WHERE id = $2', [recompensa.custo_pontos, cliente.id]);
    await client.query('INSERT INTO resgates (cliente_id, recompensa_id, pontos_gastos) VALUES ($1, $2, $3)', [cliente.id, recompensa.id, recompensa.custo_pontos]);
    
    await client.query('COMMIT');

    const pontosRestantes = cliente.pontos_totais - recompensa.custo_pontos;
    res.status(200).json({ message: 'Recompensa resgatada com sucesso!', pontos_restantes: pontosRestantes });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro no resgate:', error);
    res.status(500).json({ error: error.message || 'Ocorreu um erro no servidor durante o resgate.' });
  } finally {
    client.release();
  }
});


// ROTA PARA REGISTRO DE NOVO USUÁRIO (ADMIN)
app.post('/usuarios/registro', async (req, res) => {
  const { nome, email, senha } = req.body;

  // 1. Validação básica de entrada
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  }

  try {
    // 2. Criptografar a senha com bcrypt
    // O 'salt' é um fator aleatório adicionado à senha antes do hash para torná-la mais segura.
    const saltRounds = 10;
    const hash_senha = await bcrypt.hash(senha, saltRounds);

    // 3. Inserir o novo usuário no banco de dados
    // Usamos 'RETURNING' para que o PostgreSQL nos devolva os dados do usuário recém-criado.
    const novoUsuario = await db.query(
      'INSERT INTO usuarios (nome, email, hash_senha, role) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, role',
      [nome, email, hash_senha, 'admin']
    );

    // 4. Responder com sucesso (NUNCA envie a hash da senha de volta)
    res.status(201).json(novoUsuario.rows[0]);

  } catch (error) {
    // 5. Tratamento de erros (ex: o email já existe)
    // O código '23505' é o erro padrão do PostgreSQL para violação de constraint de unicidade.
    if (error.code === '23505') { 
      return res.status(409).json({ error: 'Este email já está em uso.' });
    }
    
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor ao registrar o usuário.' });
  }
});


// ROTA PARA LOGIN DE USUÁRIO
app.post('/usuarios/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  try {
    // 1. Encontrar o usuário pelo email
    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const usuario = result.rows[0];

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // 2. Comparar a senha enviada com a hash guardada no banco
    const senhaValida = await bcrypt.compare(senha, usuario.hash_senha);

    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // 3. Se a senha for válida, gerar um token JWT
    const tokenPayload = {
      id: usuario.id,
      nome: usuario.nome,
      role: usuario.role
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '8h' // O token expira em 8 horas
    });

    // 4. Enviar o token de volta para o cliente
    res.status(200).json({
      message: 'Login bem-sucedido!',
      token: token
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor durante o login.' });
  }
});


// 5. Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});