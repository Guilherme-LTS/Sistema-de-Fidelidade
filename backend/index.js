// backend/index.js - VERSÃO FINAL CORRIGIDA

// 1. Importações
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const { cpf: cpfValidator } = require('cpf-cnpj-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verificaToken = require('./middleware/autenticacao');

// 2. Inicialização do App e CORS
const app = express();
const PORT = process.env.PORT || 3001;
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
app.use(cors(corsOptions));
app.use(express.json());

// --- ROTAS DA APLICAÇÃO ---

// backend/index.js

app.post('/transacoes', verificaToken, async (req, res) => {
  // ADIÇÃO CRÍTICA: Verifica se o usuário logado tem o cargo 'admin'
  if (req.usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem lançar pontos.' });
  }
 
  const client = await db.connect();
  try {
    const { cpf, valor, nome } = req.body;
    if (!cpf || !valor || valor <= 0) { return res.status(400).json({ error: 'CPF e valor (maior que zero) são obrigatórios.' }); }
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (!cpfValidator.isValid(cpfLimpo)) { return res.status(400).json({ error: 'CPF inválido.' }); }
    
    // 1. Pegamos o ID do operador que está logado, vindo do token
    const operadorId = req.usuario.id;
    
    const pontosGanhos = Math.floor(valor);
    const diasParaLiberacao = 0; 
    const diasParaVencimento = 180;

    const agora = new Date();
    const data_liberacao = new Date(new Date(agora).setDate(agora.getDate() + diasParaLiberacao));
    const data_vencimento = new Date(new Date(agora).setDate(agora.getDate() + diasParaVencimento));
    
    await client.query('BEGIN');
    let resCliente = await client.query('SELECT id FROM clientes WHERE cpf = $1', [cpfLimpo]);
    let clienteId;

    if (!resCliente.rows[0]) {
      const resNovoCliente = await client.query('INSERT INTO clientes (cpf, nome) VALUES ($1, $2) RETURNING id', [cpfLimpo, nome]);
      clienteId = resNovoCliente.rows[0].id;
    } else {
      clienteId = resCliente.rows[0].id;
    }

    
    await client.query(
      `INSERT INTO transacoes (cliente_id, valor_gasto, pontos_ganhos, data_liberacao, data_vencimento, usuario_id) VALUES ($1, $2, $3, $4, $5, $6)`,
      [clienteId, valor, pontosGanhos, data_liberacao, data_vencimento, operadorId]
    );
    
    await client.query('COMMIT');
    res.status(201).json({ message: 'Transação registrada! Pontos ficarão disponíveis em breve.', pontosGanhos });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Erro ao processar a transação:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  } finally {
    if (client) client.release();
  }
});

// backend/index.js

// ROTA PROTEGIDA PARA LISTAR E BUSCAR CLIENTES (VERSÃO FINAL CORRIGIDA)
app.get('/clientes', verificaToken, async (req, res) => {
  const { busca, page = 1, limit = 15 } = req.query;

  try {
    const offset = (page - 1) * limit;
    let totalClientes;
    let clientes;

    // Se HÁ um termo de busca, a lógica é mais complexa
    if (busca && busca.trim() !== '') {
      const termoBuscaNome = `%${busca}%`;
      const cpfBusca = busca.replace(/\D/g, ''); // Extrai apenas os números

      let whereClause = 'WHERE nome ILIKE $1';
      let params = [termoBuscaNome];

      // SÓ adicionamos a busca por CPF se o termo de busca contiver números
      if (cpfBusca) {
        whereClause += ' OR cpf LIKE $2';
        params.push(`%${cpfBusca}%`);
      }

      const countResult = await db.query(`SELECT COUNT(*) FROM clientes ${whereClause}`, params);
      totalClientes = parseInt(countResult.rows[0].count, 10);

      // Ajustamos os placeholders de LIMIT e OFFSET dinamicamente
      const limitOffsetPlaceholders = `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      const dataResult = await db.query(
        `SELECT id, nome, cpf FROM clientes ${whereClause} ORDER BY nome ASC ${limitOffsetPlaceholders}`,
        [...params, limit, offset]
      );
      clientes = dataResult.rows;

    } else {
      // Se NÃO HÁ busca, a lógica é simples (listar todos)
      const countResult = await db.query('SELECT COUNT(*) FROM clientes');
      totalClientes = parseInt(countResult.rows[0].count, 10);

      const dataResult = await db.query(
        'SELECT id, nome, cpf FROM clientes ORDER BY nome ASC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      clientes = dataResult.rows;
    }
    
    res.status(200).json({
      clientes: clientes,
      total: totalClientes,
      paginaAtual: parseInt(page, 10),
      totalPaginas: Math.ceil(totalClientes / limit),
    });

  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

// ROTA DE CONSULTA DE PONTOS (CORRIGIDA)
app.get('/clientes/:cpf', async (req, res) => {
  try {
    const cpfParam = req.params.cpf.replace(/\D/g, '');
    if (!cpfParam || cpfParam.length !== 11) { return res.status(400).json({ error: 'Formato de CPF inválido.' }); }
    
    const clienteResult = await db.query('SELECT id, nome, cpf FROM clientes WHERE cpf = $1', [cpfParam]);
    const cliente = clienteResult.rows[0];
    if (!cliente) { return res.status(404).json({ error: 'Cliente não encontrado.' }); }

    const clienteId = cliente.id;

    const creditosResult = await db.query(
      `SELECT COALESCE(SUM(pontos_ganhos), 0) as total FROM transacoes WHERE cliente_id = $1 AND data_liberacao <= NOW() AND data_vencimento > NOW()`,
      [clienteId]
    );
    const debitosResult = await db.query(
      `SELECT COALESCE(SUM(pontos_gastos), 0) as total FROM resgates WHERE cliente_id = $1`,
      [clienteId]
    );
    const pontosDisponiveis = parseInt(creditosResult.rows[0].total) - parseInt(debitosResult.rows[0].total);

    const pontosPendentesResult = await db.query(
      `SELECT COALESCE(SUM(pontos_ganhos), 0) as total FROM transacoes WHERE cliente_id = $1 AND data_liberacao > NOW()`,
      [clienteId]
    );
    const pontosPendentes = parseInt(pontosPendentesResult.rows[0].total);

    const proximoVencimentoResult = await db.query(
      `SELECT MIN(data_vencimento) as proximo_vencimento FROM transacoes WHERE cliente_id = $1 AND data_vencimento > NOW()`,
      [clienteId]
    );
    const proximoVencimento = proximoVencimentoResult.rows[0].proximo_vencimento;

    res.status(200).json({
      nome: cliente.nome,
      cpf: cliente.cpf,
      pontosDisponiveis,
      pontosPendentes,
      proximoVencimento,
    });

  } catch (error) {
    console.error('Erro ao consultar cliente:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

app.get('/clientes/:cpf/extrato', async (req, res) => {
  try {
    const cpfParam = req.params.cpf.replace(/\D/g, '');
    if (!cpfParam || cpfParam.length !== 11) {
      return res.status(400).json({ error: 'Formato de CPF inválido.' });
    }

    // Primeiro, encontramos o cliente para obter o ID
    const clienteResult = await db.query('SELECT id FROM clientes WHERE cpf = $1', [cpfParam]);
    const cliente = clienteResult.rows[0];
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    const clienteId = cliente.id;

    // Query para buscar os CRÉDITOS (pontos ganhos)
    const creditosQuery = `
      SELECT 
        'credito' as tipo,
        pontos_ganhos as pontos,
        data_transacao as data,
        'Pontos por compra' as descricao
      FROM transacoes
      WHERE cliente_id = $1
    `;
    const creditosResult = await db.query(creditosQuery, [clienteId]);

    // Query para buscar os DÉBITOS (pontos gastos)
    const debitosQuery = `
      SELECT 
        'debito' as tipo,
        res.pontos_gastos as pontos,
        res.data_resgate as data,
        rec.nome as descricao
      FROM resgates res
      JOIN recompensas rec ON res.recompensa_id = rec.id
      WHERE res.cliente_id = $1
    `;
    const debitosResult = await db.query(debitosQuery, [clienteId]);

    // Juntamos os dois resultados em um único array
    const extrato = [...creditosResult.rows, ...debitosResult.rows];

    // Ordenamos o extrato pela data, do mais recente para o mais antigo
    extrato.sort((a, b) => new Date(b.data) - new Date(a.data));

    res.status(200).json(extrato);

  } catch (error) {
    console.error('Erro ao buscar extrato do cliente:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});



// ROTA DE RESGATE (CORRIGIDA)

app.post('/resgates', verificaToken, async (req, res) => {
  const client = await db.connect();
  try {
    const { cpf, recompensa_id } = req.body;
    // 1. Pegamos o ID do operador logado
    const operadorId = req.usuario.id; 
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    if (!cpfLimpo || !recompensa_id) { return res.status(400).json({ error: 'CPF e ID da recompensa são obrigatórios.' }); }
    await client.query('BEGIN');
    const clienteResult = await client.query('SELECT id FROM clientes WHERE cpf = $1', [cpfLimpo]);
    const cliente = clienteResult.rows[0];
    if (!cliente) throw new Error('Cliente não encontrado.');
    const recompensaResult = await client.query('SELECT custo_pontos FROM recompensas WHERE id = $1', [recompensa_id]);
    const recompensa = recompensaResult.rows[0];
    if (!recompensa) throw new Error('Recompensa não encontrada.');

    const creditosResult = await client.query(`SELECT COALESCE(SUM(pontos_ganhos), 0) as total FROM transacoes WHERE cliente_id = $1 AND data_liberacao <= NOW() AND data_vencimento > NOW()`, [cliente.id]);
    const debitosResult = await client.query(`SELECT COALESCE(SUM(pontos_gastos), 0) as total FROM resgates WHERE cliente_id = $1`, [cliente.id]);
    const pontosDisponiveis = parseInt(creditosResult.rows[0].total) - parseInt(debitosResult.rows[0].total);
    if (pontosDisponiveis < recompensa.custo_pontos) { throw new Error('Pontos disponíveis insuficientes.'); }

    // 2. Na hora de inserir o resgate, salvamos também o ID do operador
    await client.query(
      'INSERT INTO resgates (cliente_id, recompensa_id, pontos_gastos, usuario_id) VALUES ($1, $2, $3, $4)',
      [cliente.id, recompensa_id, recompensa.custo_pontos, operadorId] // Adicionado operadorId
    );
    
    await client.query('COMMIT');

    const pontosRestantes = pontosDisponiveis - recompensa.custo_pontos;
    res.status(200).json({ message: 'Recompensa resgatada com sucesso!', pontos_restantes: pontosRestantes });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Erro no resgate:', error);
    res.status(500).json({ error: error.message || 'Ocorreu um erro no servidor.' });
  } finally {
    if (client) client.release();
  }
});


// ROTA PARA BUSCAR RECOMPENSAS
app.get('/recompensas', verificaToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM recompensas WHERE ativo = true ORDER BY custo_pontos ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar recompensas:', error);
    res.status(500).json({ error: 'Erro ao buscar recompensas.' });
  }
});

// NOVA ROTA PÚBLICA PARA BUSCAR RECOMPENSAS (usada pelo cliente)
app.get('/recompensas/publica', async (req, res) => {
  try {
    const result = await db.query('SELECT nome, custo_pontos FROM recompensas WHERE ativo = true ORDER BY custo_pontos ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar recompensas públicas:', error);
    res.status(500).json({ error: 'Erro ao buscar recompensas.' });
  }
});


// ROTA PARA CRIAR UMA NOVA RECOMPENSA (CREATE)
app.post('/recompensas', verificaToken, async (req, res) => {
  const { nome, descricao, custo_pontos } = req.body;

  if (!nome || !custo_pontos) {
    return res.status(400).json({ error: 'Nome e custo em pontos são obrigatórios.' });
  }

  try {
    const novaRecompensa = await db.query(
      'INSERT INTO recompensas (nome, descricao, custo_pontos) VALUES ($1, $2, $3) RETURNING *',
      [nome, descricao, custo_pontos]
    );
    res.status(201).json(novaRecompensa.rows[0]);
  } catch (error) {
    console.error('Erro ao criar recompensa:', error);
    res.status(500).json({ error: 'Erro no servidor ao criar recompensa.' });
  }
});

// ROTA PARA ATUALIZAR UMA RECOMPENSA (UPDATE)
app.put('/recompensas/:id', verificaToken, async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, custo_pontos } = req.body;

  if (!nome || !custo_pontos) {
    return res.status(400).json({ error: 'Nome e custo em pontos são obrigatórios.' });
  }

  try {
    const recompensaAtualizada = await db.query(
      'UPDATE recompensas SET nome = $1, descricao = $2, custo_pontos = $3 WHERE id = $4 RETURNING *',
      [nome, descricao, custo_pontos, id]
    );

    if (recompensaAtualizada.rows.length === 0) {
      return res.status(404).json({ error: 'Recompensa não encontrada.' });
    }

    res.status(200).json(recompensaAtualizada.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar recompensa:', error);
    res.status(500).json({ error: 'Erro no servidor ao atualizar recompensa.' });
  }
});

// ROTA PARA "DELETAR" (DESATIVAR) UMA RECOMPENSA
app.delete('/recompensas/:id', verificaToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Em vez de DELETAR, nós ATUALIZAMOS a coluna 'ativo' para 'false'
    const result = await db.query(
      "UPDATE recompensas SET ativo = false WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recompensa não encontrada.' });
    }
    
    // Atualizamos a mensagem para refletir a nova ação
    res.status(200).json({ message: 'Recompensa desativada com sucesso!' });

  } catch (error) {
    // O erro de foreign key não acontecerá mais, mas mantemos o tratamento de erros
    console.error('Erro ao desativar recompensa:', error);
    res.status(500).json({ error: 'Erro no servidor ao desativar recompensa.' });
  }
});



// ROTA PARA REGISTRO DE USUÁRIO

app.post('/usuarios/registro', async (req, res) => {
  const { nome, email, senha, role = 'operador' } = req.body;

  if (!nome || !email || !senha) { 
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' }); 
  }

  try {
    const saltRounds = 10;
    const hash_senha = await bcrypt.hash(senha, saltRounds);
    
    const novoUsuario = await db.query(
      'INSERT INTO usuarios (nome, email, hash_senha, role) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, role',
      [nome, email, hash_senha, role]
    );

    res.status(201).json(novoUsuario.rows[0]);

  } catch (error) {
    if (error.code === '23505') { 
      return res.status(409).json({ error: 'Este email já está em uso.' }); 
    }
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});


// ROTA PÚBLICA PARA CADASTRO DE NOVOS CLIENTES (VERSÃO ATUALIZADA E INTELIGENTE)
app.post('/clientes/cadastro', async (req, res) => {
  const { nome, cpf, lgpd_consentimento } = req.body;

  // 1. Validação dos dados de entrada (continua a mesma)
  if (!nome || !cpf) {
    return res.status(400).json({ error: 'Nome e CPF são obrigatórios.' });
  }
  if (lgpd_consentimento !== true) {
    return res.status(400).json({ error: 'É necessário aceitar os termos de uso e a política de privacidade.' });
  }

  const cpfLimpo = cpf.replace(/\D/g, '');
  if (!cpfValidator.isValid(cpfLimpo)) {
    return res.status(400).json({ error: 'O CPF informado é inválido.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 2. Verifica se um cliente com este CPF já existe
    const existingClientResult = await client.query('SELECT * FROM clientes WHERE cpf = $1', [cpfLimpo]);
    const existingClient = existingClientResult.rows[0];

    let finalClient;

    if (existingClient) {
      // 3. Se o cliente JÁ EXISTE:
      if (existingClient.nome) {
        // Se ele já tem um nome, ele está totalmente cadastrado.
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Este CPF já está cadastrado em nosso sistema.' });
      } else {
        // Se ele existe mas não tem nome, é um "resgate de conta". ATUALIZAMOS os dados.
        const updatedClientResult = await client.query(
          `UPDATE clientes 
           SET nome = $1, lgpd_consentimento = $2, data_consentimento = $3 
           WHERE cpf = $4 
           RETURNING id, nome, cpf`,
          [nome, lgpd_consentimento, new Date(), cpfLimpo]
        );
        finalClient = updatedClientResult.rows[0];
      }
    } else {
      // 4. Se o cliente NÃO EXISTE, criamos um novo.
      const newClientResult = await client.query(
        `INSERT INTO clientes (nome, cpf, lgpd_consentimento, data_consentimento) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, nome, cpf`,
        [nome, cpfLimpo, lgpd_consentimento, new Date()]
      );
      finalClient = newClientResult.rows[0];
    }

    await client.query('COMMIT');

    // 5. Responde com sucesso
    res.status(201).json({
      message: 'Cadastro realizado com sucesso!',
      cliente: finalClient,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao cadastrar cliente:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor ao realizar o cadastro.' });
  } finally {
    if (client) client.release();
  }
});

// ROTA PARA LOGIN DE USUÁRIO
app.post('/usuarios/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) { return res.status(400).json({ error: 'Email e senha são obrigatórios.' }); }
  try {
    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const usuario = result.rows[0];
    if (!usuario) { return res.status(401).json({ error: 'Credenciais inválidas.' }); }
    const senhaValida = await bcrypt.compare(senha, usuario.hash_senha);
    if (!senhaValida) { return res.status(401).json({ error: 'Credenciais inválidas.' }); }
    const tokenPayload = { id: usuario.id, nome: usuario.nome, role: usuario.role };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.status(200).json({ message: 'Login bem-sucedido!', token: token });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

// ROTA DO DASHBOARD (CORRIGIDA)
app.get('/dashboard/stats', verificaToken, async (req, res) => {
  try {
    const metricasQuery = `SELECT (SELECT COUNT(*) FROM clientes) as total_clientes, (SELECT COALESCE(SUM(pontos_ganhos), 0) FROM transacoes) as total_pontos_distribuidos;`;
    const resMetricas = await db.query(metricasQuery);

    const topClientesQuery = `
      SELECT
        c.nome,
        c.cpf,
        (SELECT COALESCE(SUM(t.pontos_ganhos), 0) FROM transacoes t WHERE t.cliente_id = c.id AND t.data_liberacao <= NOW() AND t.data_vencimento > NOW()) - 
        (SELECT COALESCE(SUM(r.pontos_gastos), 0) FROM resgates r WHERE r.cliente_id = c.id) as pontos_disponiveis
      FROM
        clientes c
      ORDER BY
        pontos_disponiveis DESC
      LIMIT 5;
    `;
    const resTopClientes = await db.query(topClientesQuery);

    const recompensasQuery = `SELECT r.nome, COUNT(res.id) as total_resgates FROM resgates res JOIN recompensas r ON res.recompensa_id = r.id GROUP BY r.nome ORDER BY total_resgates DESC LIMIT 5;`;
    const resRecompensas = await db.query(recompensasQuery);

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

// backend/index.js

app.get('/admin/auditoria', verificaToken, async (req, res) => {
  // Apenas usuários com cargo 'admin' podem acessar esta rota
  if (req.usuario.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }

  try {
    const query = `
      -- Seleciona os lançamentos de pontos
      SELECT 
        t.id,
        t.data_transacao as data,
        'Lançamento de Pontos' as acao,
        c.nome as nome_cliente,
        u.nome as nome_operador,
        t.pontos_ganhos as pontos
      FROM transacoes t
      JOIN clientes c ON t.cliente_id = c.id
      JOIN usuarios u ON t.usuario_id = u.id

      UNION ALL

      -- Seleciona os resgates de recompensas
      SELECT 
        r.id,
        r.data_resgate as data,
        rec.nome as acao,
        c.nome as nome_cliente,
        u.nome as nome_operador,
        r.pontos_gastos * -1 as pontos -- Mostra como um valor negativo
      FROM resgates r
      JOIN clientes c ON r.cliente_id = c.id
      JOIN usuarios u ON r.usuario_id = u.id
      JOIN recompensas rec ON r.recompensa_id = rec.id

      ORDER BY data DESC; -- Ordena o resultado final pela data
    `;

    const result = await db.query(query);
    res.status(200).json(result.rows);

  } catch (error) {
    console.error('Erro ao buscar log de auditoria:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});


// 5. Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
