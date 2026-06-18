import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const migrationsDir = path.join(__dirname, 'migrations');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    // 1. Criar tabela de controle de migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 1.5 Sincronizar banco de dados legado
    // Se a tabela customers existe (fase 1 aplicada no passado), mas _migrations está vazia/só com a 000,
    // significa que este é o banco original que já foi migrado manualmente.
    // Marcamos as migrations de 000 a 015 como aplicadas para não rodá-las novamente e dar erro de "relation already exists".
    const { rows: migrationsCount } = await client.query('SELECT count(*) as total FROM _migrations');
    if (parseInt(migrationsCount[0].total) <= 1) {
      const { rows: tableCheck } = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'customers'
        );
      `);
      if (tableCheck[0].exists) {
        console.log('📦 Banco de dados legado detectado (tabelas já migradas). Sincronizando controle de migrations...');
        const legacyMigrationsToSync = [
          '000_1_init_base_tables.sql',
          '001_setup_configuracoes.ts',
          '002_fase1_ddl_evolution.sql',
          '003_fase2_tenants_and_backfill.sql',
          '004_fase3_constraints_and_indexes.sql',
          '005_fase4_rls.sql',
          '006_fase5_tenant_settings_per_tenant_up.sql',
          '007_fase6_tenant_identity_uses_supabase_uid_up.sql',
          '008_fase7_critical_indexes.sql',
          '009_fase8_audit_logs.sql',
          '010_fase9_audit_logs_business_fields.sql',
          '011_fase10_tenant_staff_sem_auth.sql',
          '012_fase11_consumer_profiles_split.sql',
          '013_fase12_consumer_profiles_rls.sql',
          '014_fase13_audit_logs_rls_hardening.sql',
          '015_fase14_consumer_profiles_rls_upsert_fix.sql'
        ];
        for (const legMig of legacyMigrationsToSync) {
          await client.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [legMig]);
        }
        console.log('✅ Migrations legadas (000 a 015) sincronizadas com sucesso.');
      }
    }

    // 2. Ler diretório de migrations
    const files = fs.readdirSync(migrationsDir);

    // 3. Filtrar e ordenar arquivos válidos (exclui scripts '_down.sql')
    const migrationFiles = files
      .filter((file) => {
        const ext = path.extname(file);
        const isSqlOrTs = ext === '.sql' || ext === '.ts';
        const isNotDown = !file.endsWith('_down.sql');
        return isSqlOrTs && isNotDown;
      })
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    console.log(`Encontradas ${migrationFiles.length} migrations no diretório.`);

    // 4. Executar cada migration pendente
    for (const file of migrationFiles) {
      // Verificar se a migration já foi aplicada
      const { rows } = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);

      if (rows.length > 0) {
        console.log(`Migration já aplicada (pulando): ${file}`);
        continue;
      }

      console.log(`Aplicando migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);

      if (file.endsWith('.sql')) {
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`✅ Migration SQL aplicada: ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      } else if (file.endsWith('.ts')) {
        // Para arquivos TypeScript (.ts), executamos como um subprocesso
        try {
          execSync(`npx ts-node "${filePath}"`, { stdio: 'inherit' });
          
          // Registrar como aplicada
          await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
          console.log(`✅ Migration TS aplicada: ${file}`);
        } catch (err: any) {
          console.error(`❌ Falha ao aplicar migration TS: ${file}`);
          throw err;
        }
      }
    }

    console.log('🎉 Todas as migrations pendentes foram aplicadas com sucesso!');
  } catch (err: any) {
    console.error('💥 Erro fatal ao rodar migrations:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
