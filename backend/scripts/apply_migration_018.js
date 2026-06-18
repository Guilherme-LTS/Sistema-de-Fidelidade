const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}

const client = new Client({
    connectionString: dbUrl,
});

async function runMigration() {
    try {
        await client.connect();
        console.log('Conectado ao banco de dados.');

        const migrationPath = path.join(__dirname, 'migrations', '018_fase16_storage_policies.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executando migration 018_fase16_storage_policies.sql...');
        await client.query(sql);
        console.log('Migration concluída com sucesso!');

    } catch (error) {
        console.error('Erro ao executar migration:', error);
    } finally {
        await client.end();
    }
}

runMigration();
