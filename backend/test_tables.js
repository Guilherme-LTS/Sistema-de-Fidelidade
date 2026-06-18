const { Client } = require('pg');
require('dotenv').config();
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(() => c.query("SELECT name FROM _migrations;"))
.then(res => { console.log(res.rows); c.end(); })
.catch(err => { console.error(err); c.end(); });
