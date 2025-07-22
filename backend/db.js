// backend/db.js
const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: isProduction ? { rejectUnauthorized: false } : false
};

const pool = new Pool(connectionConfig);

pool.connect((err) => {
  if (err) {
    console.error('Erro de conexão com o PostgreSQL', err.stack);
  } else {
    console.log('Conectado com sucesso ao PostgreSQL!');
  }
});

module.exports = pool;