const { Pool } = require('pg');
require('dotenv').config();

const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
    };

const pool = new Pool(connectionConfig);

async function getSchema() {
  const query = `
    SELECT table_name, column_name, data_type, column_default 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;
  try {
    const res = await pool.query(query);
    const schema = {};
    res.rows.forEach(row => {
      if (!schema[row.table_name]) schema[row.table_name] = [];
      schema[row.table_name].push(`${row.column_name} (${row.data_type}) [default: ${row.column_default}]`);
    });
    console.log(JSON.stringify(schema, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

getSchema();