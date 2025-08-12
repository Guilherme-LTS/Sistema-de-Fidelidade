// backend/index.js

// 1. Importações
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db'); // Nosso pool de conexão PostgreSQL
const { cpf: cpfValidator } = require('cpf-cnpj-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verificaToken = require('./middleware/autenticacao');


// 2. Inicialização do App
const app = express();
const PORT = process.env.PORT || 3001;

// --- CONFIGURAÇÃO DE SEGURANÇA CORS ---

const allowedOrigins = [
  'http://localhost:3000',
  'https://sistema-fidelidade-flax.vercel.app' // A URL do seu site
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

// Rota principal - POST /transacoes (Versão 2.0 com ciclo de vida dos pontos)
app.post('/transacoes', async (req, res) => {
  // No V2, esta rota precisa ser protegida, pois só o operador pode lançar pontos.
  // Futuramente, adicionaremos o 'verificaToken' aqui.
  const client = await db.connect();
  try {
    const { cpf, valor, nome } = req.body;
    if (!cpf || !valor || valor <= 0) { return res.status(400).json({ error: 'CPF e valor (maior que zero) são obrigatórios.' }); }
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (!cpfValidator.isValid(cpfLimpo)) { return res.status(400).json({ error: 'CPF inválido.' }); }

    const pontosGanhos = Math.floor(valor);

    // --- LÓGICA DE DATAS (MODIFICADA PARA TESTE) ---
    // Definimos as regras do negócio aqui.
    const minutosParaLiberacao = 1; // <<< MUDANÇA AQUI
    const diasParaVencimento = 60;

    const agora = new Date();
    // Usamos setMinutes() em vez de setDate() para a liberação
    const data_liberacao = new Date(new Date(agora).setMinutes(agora.getMinutes() + minutosParaLiberacao));
    const data_vencimento = new Date(new Date(agora).setDate(agora.getDate() + diasParaVencimento));
    // --- FIM DA LÓGICA DE DATAS ---

    await client.query('BEGIN');

    let resCliente = await client.query('SELECT * FROM clientes WHERE cpf = $1', [cpfLimpo]);
    let cliente = resCliente.rows[0];
    let clienteId;

    if (!cliente) {
      const resNovoCliente = await client.query(
        'INSERT INTO clientes (cpf, nome, pontos_totais) VALUES ($1, $2, 0) RETURNING id',
        [cpfLimpo, nome]
      );
      clienteId = resNovoCliente.rows[0].id;
    } else {
      clienteId = cliente.id;
    }

    // AGORA, inserimos a transação com as novas informações de data e status
    await client.query(
      `INSERT INTO transacoes 
        (cliente_id, valor_gasto, pontos_ganhos, status, data_liberacao, data_vencimento) 
       VALUES ($1, $2, $3, 'pendente', $4, $5)`,
      [clienteId, valor, pontosGanhos, data_liberacao, data_vencimento]
    );

    // IMPORTANTE: Não atualizamos mais o 'pontos_totais' do cliente aqui.
    // Ele será calculado dinamicamente a partir de agora.

    await client.query('COMMIT');
    res.status(201).json({ message: 'Transação registrada! Pontos ficarão disponíveis em breve.', pontosGanhos });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao processar a transação:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor ao processar a transação.' });
  } finally {
    client.release();
  }
});

// ROTA PARA CONSULTAR SALDO DE PONTOS (Versão 2.0 com Gamificação)
app.get('/clientes/:cpf', async (req, res) => {
  // Esta rota é pública para o cliente e protegida para o admin.
  // A proteção é verificada no frontend (se o token existe ou não).
  try {
    const cpfParam = req.params.cpf.replace(/\D/g, '');
    if (!cpfParam || cpfParam.length !== 11) {
      return res.status(400).json({ error: 'Formato de CPF inválido.' });
    }
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');

      // Passo 1: Encontrar o cliente
      const clienteResult = await client.query('SELECT id, nome, cpf FROM clientes WHERE cpf = $1', [cpfParam]);
      const cliente = clienteResult.rows[0];

      if (!cliente) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }

      const clienteId = cliente.id;

      // Passo 2: Atualizar transações pendentes que já podem ser liberadas
      await client.query(
        `UPDATE transacoes 
         SET status = 'disponivel' 
         WHERE cliente_id = $1 AND status = 'pendente' AND data_liberacao <= NOW()`,
        [clienteId]
      );
      
      // Passo 3: Calcular os pontos disponíveis (que não estão expirados)
      const pontosDisponiveisResult = await client.query(
        `SELECT SUM(pontos_ganhos) as total 
         FROM transacoes 
         WHERE cliente_id = $1 AND status = 'disponivel' AND data_vencimento > NOW()`,
        [clienteId]
      );
      const pontosDisponiveis = parseInt(pontosDisponiveisResult.rows[0].total) || 0;

      // Passo 4: Calcular os pontos pendentes
      const pontosPendentesResult = await client.query(
        `SELECT SUM(pontos_ganhos) as total 
         FROM transacoes 
         WHERE cliente_id = $1 AND status = 'pendente'`,
        [clienteId]
      );
      const pontosPendentes = parseInt(pontosPendentesResult.rows[0].total) || 0;

      // Passo 5 (Bônus): Encontrar a data de vencimento mais próxima
      const proximoVencimentoResult = await client.query(
        `SELECT MIN(data_vencimento) as proximo_vencimento 
         FROM transacoes 
         WHERE cliente_id = $1 AND status = 'disponivel' AND data_vencimento > NOW()`,
        [clienteId]
      );
      const proximoVencimento = proximoVencimentoResult.rows[0].proximo_vencimento;

      await client.query('COMMIT');

      // Passo 6: Retornar o objeto completo com todas as informações
      res.status(200).json({
        nome: cliente.nome,
        cpf: cliente.cpf,
        pontosDisponiveis,
        pontosPendentes,
        proximoVencimento,
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error; // Joga o erro para o catch principal
    } finally {
      client.release();
    }

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

// ROTA PARA PROCESSAR O RESGATE DE UMA RECOMPENSA (Versão 2.0 com gasto FIFO)
app.post('/resgates', verificaToken, async (req, res) => {
  const client = await db.connect();
  try {
    const { cpf, recompensa_id } = req.body;
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (!cpfLimpo || !recompensa_id) {
      return res.status(400).json({ error: 'CPF e ID da recompensa são obrigatórios.' });
    }

    await client.query('BEGIN');

    const clienteResult = await client.query('SELECT id FROM clientes WHERE cpf = $1', [cpfLimpo]);
    const cliente = clienteResult.rows[0];
    if (!cliente) throw new Error('Cliente não encontrado.');

    const recompensaResult = await client.query('SELECT custo_pontos FROM recompensas WHERE id = $1', [recompensa_id]);
    const recompensa = recompensaResult.rows[0];
    if (!recompensa) throw new Error('Recompensa não encontrada.');

    let pontosNecessarios = recompensa.custo_pontos;

    const pontosDisponiveisResult = await client.query(
      `SELECT SUM(pontos_ganhos) as total 
       FROM transacoes 
       WHERE cliente_id = $1 AND status = 'disponivel' AND data_vencimento > NOW()`,
      [cliente.id]
    );
    const pontosDisponiveis = parseInt(pontosDisponiveisResult.rows[0].total) || 0;

    if (pontosDisponiveis < pontosNecessarios) {
      throw new Error('Pontos disponíveis insuficientes para resgatar esta recompensa.');
    }

    const transacoesDisponiveisResult = await client.query(
      `SELECT id, pontos_ganhos 
       FROM transacoes 
       WHERE cliente_id = $1 AND status = 'disponivel' AND data_vencimento > NOW() 
       ORDER BY data_transacao ASC`, // <--- A CORREÇÃO ESTÁ AQUI
      [cliente.id]
    );

    for (const transacao of transacoesDisponiveisResult.rows) {
      if (pontosNecessarios <= 0) break;
      await client.query(
        "UPDATE transacoes SET status = 'gasto' WHERE id = $1",
        [transacao.id]
      );
      pontosNecessarios -= transacao.pontos_ganhos;
    }
    
    await client.query(
      'INSERT INTO resgates (cliente_id, recompensa_id, pontos_gastos) VALUES ($1, $2, $3)',
      [cliente.id, recompensa_id, recompensa.custo_pontos]
    );

    await client.query('COMMIT');

    res.status(200).json({ message: 'Recompensa resgatada com sucesso!' });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Erro no resgate:', error);
    res.status(500).json({ error: error.message || 'Ocorreu um erro no servidor durante o resgate.' });
  } finally {
    if (client) client.release();
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
  console.log("\n--- RECEBIDO NO BACKEND ---");
  const { email, senha } = req.body;
  console.log(`Email: [${email}]`);
  console.log(`Senha: [${senha}]`); // Vamos ver o que realmente chegou aqui
  console.log("--------------------------");

  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  try {
    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const usuario = result.rows[0];

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.hash_senha);

    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const tokenPayload = {
      id: usuario.id,
      nome: usuario.nome,
      role: usuario.role
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '8h'
    });

    res.status(200).json({
      message: 'Login bem-sucedido!',
      token: token
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor durante o login.' });
  }
});




// ROTA PROTEGIDA PARA ESTATÍSTICAS DO DASHBOARD
app.get('/dashboard/stats', verificaToken, async (req, res) => {
  try {
    // Query para as métricas gerais
    const metricasQuery = `
      SELECT
        (SELECT COUNT(*) FROM clientes) as total_clientes,
        (SELECT SUM(pontos_ganhos) FROM transacoes) as total_pontos_distribuidos;
    `;
    const resMetricas = await db.query(metricasQuery);

    // Query para o Top 5 clientes 
    const topClientesQuery = `
      SELECT
        c.nome,
        c.cpf,
        COALESCE(SUM(t.pontos_ganhos), 0) as pontos_disponiveis
      FROM
        clientes c
      LEFT JOIN
        transacoes t ON c.id = t.cliente_id AND t.status = 'disponivel' AND t.data_vencimento > NOW()
      GROUP BY
        c.id, c.nome, c.cpf
      ORDER BY
        pontos_disponiveis DESC
      LIMIT 5;
    `;
    const resTopClientes = await db.query(topClientesQuery);

    // Query para as recompensas mais resgatadas 
    const recompensasQuery = `
      SELECT r.nome, COUNT(res.id) as total_resgates
      FROM resgates res
      JOIN recompensas r ON res.recompensa_id = r.id
      GROUP BY r.nome
      ORDER BY total_resgates DESC
      LIMIT 5;
    `;
    const resRecompensas = await db.query(recompensasQuery);

    // Monta o objeto de resposta
    const stats = {
      metricas: resMetricas.rows[0],
      topClientes: resTopClientes.rows,
      recompensasPopulares: resRecompensas.rows,
    };

    res.status(200).json(stats);

  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});




// 5. Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});