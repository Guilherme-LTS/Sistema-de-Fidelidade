const { Client } = require('pg');
require('dotenv').config();
const c = new Client({connectionString: process.env.DATABASE_URL});
c.connect().then(async () => {
    const cols = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'configuracoes'");
    console.log('Columns in configuracoes:', cols.rows);
    const data = await c.query("SELECT * FROM configuracoes");
    console.log('Data in configuracoes:', data.rows);
    process.exit(0);
}).catch(console.error);