require('dotenv').config();
const http = require('http');

// Helper to make HTTP requests
function makeRequest(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 5000
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
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testHttpEndpoints() {
  console.log('\n========== TESTE DE ENDPOINTS HTTP (FASE 2) ==========\n');

  try {
    // Test available endpoints status
    console.log('📋 Verificando endpoints disponíveis via HTTP...\n');
    
    const endpoints = [
      { path: '/health', method: 'GET', desc: 'Health check' },
      { path: '/clientes', method: 'GET', desc: 'Listar clientes' },
      { path: '/admin/usuarios', method: 'GET', desc: 'Listar usuários (admin)' },
      { path: '/admin/configuracoes', method: 'GET', desc: 'Listar configs (admin)' },
      { path: '/recompensas', method: 'GET', desc: 'Listar recompensas' },
      { path: '/recompensas', method: 'POST', desc: 'Criar recompensa (POST)' },
      { path: '/transacoes', method: 'GET', desc: 'Listar transações' },
      { path: '/transacoes', method: 'POST', desc: 'Lançar transação (POST)' },
      { path: '/resgates', method: 'POST', desc: 'Resgatar pontos (POST)' },
      { path: '/public/pontos/12345678901', method: 'GET', desc: 'Consulta pública de pontos' },
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const endpoint of endpoints) {
      try {
        const body = endpoint.method === 'POST' ? { test: true } : undefined;
        const res = await makeRequest(
          endpoint.method, 
          endpoint.path, 
          {
            'Authorization': 'Bearer test-token-123',
            'X-Tenant-ID': '00000000-0000-0000-0000-000000000000'
          },
          body
        );
        
        const isSuccess = res.status >= 200 && res.status < 500; // Connection success even if auth fails
        const mark = res.status >= 200 && res.status < 400 ? '✅' : '⚠️';
        
        if (isSuccess) successCount++;
        
        console.log(`   ${mark} ${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(35)} (${res.status}) - ${endpoint.desc}`);
      } catch (err) {
        errorCount++;
        console.log(`   ❌ ${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(35)} ERROR - ${err.message}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Resultados:`);
    console.log(`   ✅ Endpoints respondendo: ${successCount}`);
    console.log(`   ❌ Erros de conexão: ${errorCount}`);
    console.log(`   📝 Total de endpoints testados: ${endpoints.length}\n`);

    console.log('✅ TESTES DE ENDPOINTS HTTP CONCLUÍDOS\n');

  } catch (error) {
    console.error('❌ Erro durante os testes HTTP:', error.message);
    process.exit(1);
  }
}

// Run tests
testHttpEndpoints().catch(err => {
  console.error(err);
  process.exit(1);
});
