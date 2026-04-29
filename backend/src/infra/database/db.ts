// backend/db.js
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const hasAppDatabaseUrl = Boolean(process.env.APP_DATABASE_URL && process.env.APP_DATABASE_URL.trim());
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
const shouldUseSsl = hasAppDatabaseUrl || hasDatabaseUrl || isProduction;

const connectionConfig = hasAppDatabaseUrl
  ? {
      connectionString: process.env.APP_DATABASE_URL,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
    }
  : hasDatabaseUrl
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(connectionConfig);

const adminPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool PostgreSQL (App User):', err.message);
});

adminPool.on('error', (err) => {
  console.error('Erro inesperado no pool PostgreSQL (Admin User):', err.message);
});

async function testConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('Conectado com sucesso ao PostgreSQL (App User)!');
    await adminPool.query('SELECT 1');
    console.log('Conectado com sucesso ao PostgreSQL (Admin User)!');
  } catch (err) {
    console.error('Falha ao conectar no PostgreSQL. Revise seu backend/.env.');
    console.error(`Detalhe: ${err.message}`);
    console.error('Campos esperados: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME ou DATABASE_URL.');
  }
}

testConnection();

export { adminPool };
export default pool;