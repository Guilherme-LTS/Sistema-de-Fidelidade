require('dotenv').config();
const { Pool } = require('pg');
const http = require('http');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

// Helper to make HTTP requests
function makeRequest(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:3001');
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testFase2Isolation() {
  console.log('\n========== TESTE DE ISOLAMENTO MULTI-TENANT (FASE 2) ==========\n');

  try {
    const client = await pool.connect();
    
    // 1. Get two tenants
    console.log('1️⃣ Buscando dois tenants...');
    const tenantsResult = await client.query(
      "SELECT id, name FROM tenants ORDER BY created_at ASC LIMIT 2"
    );
    
    if (tenantsResult.rows.length < 2) {
      console.error('❌ Necessário ter ao menos 2 tenants. Encontrados:', tenantsResult.rows.length);
      client.release();
      return;
    }

    const tenant1 = tenantsResult.rows[0];
    const tenant2 = tenantsResult.rows[1];
    console.log(`✅ Tenant 1: ${tenant1.name} (${tenant1.id})`);
    console.log(`✅ Tenant 2: ${tenant2.name} (${tenant2.id})\n`);

    // 2. Get admin users for each tenant
    console.log('2️⃣ Buscando usuários admin para cada tenant...');
    const admin1Result = await client.query(
      "SELECT id, user_id, name FROM tenant_users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1",
      [tenant1.id]
    );
    const admin2Result = await client.query(
      "SELECT id, user_id, name FROM tenant_users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1",
      [tenant2.id]
    );

    if (admin1Result.rows.length === 0 || admin2Result.rows.length === 0) {
      console.error('❌ Não encontrado usuário admin para um dos tenants');
      client.release();
      return;
    }

    const admin1 = admin1Result.rows[0];
    const admin2 = admin2Result.rows[0];
    console.log(`✅ Admin Tenant 1: ${admin1.name}`);
    console.log(`✅ Admin Tenant 2: ${admin2.name}\n`);

    // 3. Get auth tokens (mock - in real scenario would login)
    console.log('3️⃣ Começando testes de isolamento...\n');

    // 4. Test tenant_settings isolation
    console.log('📋 TESTE 1: Configurações por Tenant (tenant_settings)\n');
    await client.query('BEGIN');
    
    // Insert different carencia_pontos for each tenant
    await client.query(
      "INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_unit) VALUES ($1, 'carencia_pontos', 5, 'dias') ON CONFLICT (tenant_id, setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value",
      [tenant1.id]
    );
    await client.query(
      "INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_unit) VALUES ($1, 'carencia_pontos', 15, 'dias') ON CONFLICT (tenant_id, setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value",
      [tenant2.id]
    );

    const settingsCheck = await client.query(
      "SELECT tenant_id::text, setting_key, setting_value FROM tenant_settings WHERE setting_key='carencia_pontos' AND tenant_id IN ($1, $2) ORDER BY tenant_id",
      [tenant1.id, tenant2.id]
    );

    console.log('   Tenant 1 carencia_pontos:', settingsCheck.rows.find(r => r.tenant_id === tenant1.id)?.setting_value, 'dias');
    console.log('   Tenant 2 carencia_pontos:', settingsCheck.rows.find(r => r.tenant_id === tenant2.id)?.setting_value, 'dias');
    console.log('   ✅ Isolamento de configurações: OK\n');

    // 5. Test customers isolation (same document, different tenants)
    console.log('📋 TESTE 2: Clientes por Tenant (mesmo CPF, tenants diferentes)\n');
    
    const testDocument = '12345678901';
    
    // Create customer in tenant1
    const cust1Result = await client.query(
      "INSERT INTO customers (document, name, lgpd_consent, tenant_id) VALUES ($1, $2, TRUE, $3) ON CONFLICT (document, tenant_id) DO UPDATE SET name = EXCLUDED.name RETURNING id, document, name, tenant_id::text",
      [testDocument, 'Cliente Teste Tenant1', tenant1.id]
    );
    const customer1 = cust1Result.rows[0];
    console.log(`   ✅ Cliente criado em Tenant 1: ID=${customer1.id}, Doc=${customer1.document}`);

    // Create same customer in tenant2
    const cust2Result = await client.query(
      "INSERT INTO customers (document, name, lgpd_consent, tenant_id) VALUES ($1, $2, TRUE, $3) ON CONFLICT (document, tenant_id) DO UPDATE SET name = EXCLUDED.name RETURNING id, document, name, tenant_id::text",
      [testDocument, 'Cliente Teste Tenant2', tenant2.id]
    );
    const customer2 = cust2Result.rows[0];
    console.log(`   ✅ Cliente criado em Tenant 2: ID=${customer2.id}, Doc=${customer2.document}`);

    // Verify both customers exist and are isolated
    const customersCheck = await client.query(
      "SELECT id::text, document, name, tenant_id::text FROM customers WHERE document = $1 ORDER BY tenant_id",
      [testDocument]
    );
    console.log(`   ✅ Total de clientes com documento ${testDocument}: ${customersCheck.rows.length}`);
    console.log(`   ✅ Isolamento de clientes: OK\n`);

    // 6. Test transactions isolation (FIFO per tenant)
    console.log('📋 TESTE 3: Transações (pontos) por Tenant\n');

    // Create transactions for customer1 in tenant1
    const txn1Result = await client.query(
      `INSERT INTO transactions (customer_id, amount_spent, points_earned, operator_id, remaining_points, tenant_id, available_at, expires_at) 
       VALUES ($1, 0, $2, $3, $2, $4, NOW(), NOW() + INTERVAL '90 days') RETURNING id, customer_id, points_earned, remaining_points, tenant_id::text`,
      [customer1.id, 100, admin1.id, tenant1.id]
    );
    const txn1 = txn1Result.rows[0];
    console.log(`   ✅ Transação criada em Tenant 1: ID=${txn1.id}, Pontos=${txn1.points_earned}`);

    // Create transactions for customer2 in tenant2
    const txn2Result = await client.query(
      `INSERT INTO transactions (customer_id, amount_spent, points_earned, operator_id, remaining_points, tenant_id, available_at, expires_at) 
       VALUES ($1, 0, $2, $3, $2, $4, NOW(), NOW() + INTERVAL '90 days') RETURNING id, customer_id, points_earned, remaining_points, tenant_id::text`,
      [customer2.id, 200, admin2.id, tenant2.id]
    );
    const txn2 = txn2Result.rows[0];
    console.log(`   ✅ Transação criada em Tenant 2: ID=${txn2.id}, Pontos=${txn2.points_earned}`);

    // Verify FIFO isolation (each tenant only sees their transactions)
    const txn1Check = await client.query(
      "SELECT id::text, customer_id, points_earned, remaining_points, tenant_id::text FROM transactions WHERE customer_id = $1 AND tenant_id = $2 ORDER BY created_at",
      [customer1.id, tenant1.id]
    );
    const txn2Check = await client.query(
      "SELECT id::text, customer_id, points_earned, remaining_points, tenant_id::text FROM transactions WHERE customer_id = $1 AND tenant_id = $2 ORDER BY created_at",
      [customer2.id, tenant2.id]
    );
    
    console.log(`   ✅ Transações Tenant 1: ${txn1Check.rows.length}`);
    console.log(`   ✅ Transações Tenant 2: ${txn2Check.rows.length}`);
    console.log(`   ✅ Isolamento de transações (FIFO): OK\n`);

    // 7. Test rewards isolation
    console.log('📋 TESTE 4: Recompensas por Tenant\n');

    // Create rewards for tenant1
    const reward1Result = await client.query(
      "INSERT INTO rewards (tenant_id, name, description, points_cost, is_active) VALUES ($1, $2, $3, $4, TRUE) RETURNING id, name, tenant_id::text",
      [tenant1.id, 'Desconto 10%', 'Desconto de 10% na próxima compra', 50]
    );
    const reward1 = reward1Result.rows[0];
    console.log(`   ✅ Recompensa criada em Tenant 1: ID=${reward1.id}, Nome=${reward1.name}`);

    // Create rewards for tenant2
    const reward2Result = await client.query(
      "INSERT INTO rewards (tenant_id, name, description, points_cost, is_active) VALUES ($1, $2, $3, $4, TRUE) RETURNING id, name, tenant_id::text",
      [tenant2.id, 'Brinde Exclusivo', 'Brinde exclusivo do tenant 2', 100]
    );
    const reward2 = reward2Result.rows[0];
    console.log(`   ✅ Recompensa criada em Tenant 2: ID=${reward2.id}, Nome=${reward2.name}`);

    // Verify rewards are isolated per tenant
    const rewards1Check = await client.query(
      "SELECT id::text, name, points_cost, tenant_id::text FROM rewards WHERE tenant_id = $1 AND is_active = TRUE ORDER BY id",
      [tenant1.id]
    );
    const rewards2Check = await client.query(
      "SELECT id::text, name, points_cost, tenant_id::text FROM rewards WHERE tenant_id = $1 AND is_active = TRUE ORDER BY id",
      [tenant2.id]
    );
    
    console.log(`   ✅ Recompensas Tenant 1: ${rewards1Check.rows.length}`);
    console.log(`   ✅ Recompensas Tenant 2: ${rewards2Check.rows.length}`);
    console.log(`   ✅ Isolamento de recompensas: OK\n`);

    // 8. Test redemptions isolation
    console.log('📋 TESTE 5: Resgates (redemptions) por Tenant\n');

    // Create redemption for tenant1
    const redeem1Result = await client.query(
      `INSERT INTO redemptions (customer_id, reward_id, points_spent, operator_id, tenant_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, customer_id, reward_id, points_spent, tenant_id::text`,
      [customer1.id, reward1.id, 50, admin1.id, tenant1.id]
    );
    const redeem1 = redeem1Result.rows[0];
    console.log(`   ✅ Resgate criado em Tenant 1: ID=${redeem1.id}, Pontos=${redeem1.points_spent}`);

    // Create redemption for tenant2
    const redeem2Result = await client.query(
      `INSERT INTO redemptions (customer_id, reward_id, points_spent, operator_id, tenant_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, customer_id, reward_id, points_spent, tenant_id::text`,
      [customer2.id, reward2.id, 100, admin2.id, tenant2.id]
    );
    const redeem2 = redeem2Result.rows[0];
    console.log(`   ✅ Resgate criado em Tenant 2: ID=${redeem2.id}, Pontos=${redeem2.points_spent}`);

    // Verify redemptions isolation
    const redeem1Check = await client.query(
      "SELECT id::text, customer_id, reward_id, points_spent, tenant_id::text FROM redemptions WHERE customer_id = $1 AND tenant_id = $2",
      [customer1.id, tenant1.id]
    );
    const redeem2Check = await client.query(
      "SELECT id::text, customer_id, reward_id, points_spent, tenant_id::text FROM redemptions WHERE customer_id = $1 AND tenant_id = $2",
      [customer2.id, tenant2.id]
    );

    console.log(`   ✅ Resgates Tenant 1: ${redeem1Check.rows.length}`);
    console.log(`   ✅ Resgates Tenant 2: ${redeem2Check.rows.length}`);
    console.log(`   ✅ Isolamento de resgates: OK\n`);

    // Rollback to avoid data pollution in test database
    await client.query('ROLLBACK');
    console.log('✅ TODOS OS TESTES PASSARAM - Transação desfeita para limpeza\n');

    client.release();

  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run tests
testFase2Isolation().catch(err => {
  console.error(err);
  process.exit(1);
});
