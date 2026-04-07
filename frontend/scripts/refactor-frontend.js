const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (/\.(ts|tsx|js|jsx)$/.test(fullPath)) {
      refactorFile(fullPath);
    }
  }
}

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Substituições de chaves e campos baseados no novo Schema BD (Inglês)
  content = content.replace(/\bcliente_id\b/g, 'customer_id');
  content = content.replace(/\busuario_id\b/g, 'operator_id');
  content = content.replace(/\brecompensa_id\b/g, 'reward_id');
  content = content.replace(/\bvalor_gasto\b/g, 'amount_spent');
  content = content.replace(/\bpontos_ganhos\b/g, 'points_earned');
  content = content.replace(/\bdata_transacao\b/g, 'created_at');
  content = content.replace(/\bpontos_gastos\b/g, 'points_spent');
  content = content.replace(/\bdata_resgate\b/g, 'created_at');
  content = content.replace(/\bdata_vencimento\b/g, 'expires_at');
  content = content.replace(/\bpontos_restantes\b/g, 'remaining_points');
  content = content.replace(/\bcusto_pontos\b/g, 'points_cost');
  content = content.replace(/\bpontos_totais\b/g, 'total_points');
  content = content.replace(/\bdata_criacao\b/g, 'created_at');
  content = content.replace(/\blgpd_consentimento\b/g, 'lgpd_consent');
  content = content.replace(/\bdata_consentimento\b/g, 'consent_date');
  
  // Propriedades do objeto, pra evitar conflito com window.document
  content = content.replace(/\.cpf\b/g, '.document');
  content = content.replace(/cpf:/g, 'document:');

  fs.writeFileSync(filePath, content, 'utf-8');
}

walkDir(srcDir);
console.log('Refatoração do Frontend concluída.');
