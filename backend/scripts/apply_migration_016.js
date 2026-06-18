const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Carrega as variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('DATABASE_URL or APP_DATABASE_URL not found in .env');
    process.exit(1);
}

const client = new Client({
    connectionString: dbUrl,
});

async function runMigration() {
    try {
        await client.connect();
        console.log('Conectado ao banco de dados.');

        const migrationPath = path.join(__dirname, 'migrations', '016_fase15_tenant_profile_fields.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executando migration 016_fase15_tenant_profile_fields.sql...');
        await client.query(sql);
        console.log('Migration concluída com sucesso!');

    } catch (error) {
        console.error('Erro ao executar migration:', error);
    } finally {
        await client.end();
    }
}

runMigration();
