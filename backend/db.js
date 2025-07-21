// backend/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false // Necessário para algumas conexões na nuvem
  }
});

pool.connect((err) => {
  if (err) {
    console.error('Erro de conexão com o PostgreSQL', err.stack);
  } else {
    console.log('Conectado com sucesso ao PostgreSQL!');
  }
});

module.exports = pool;