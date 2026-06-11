const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'modules');

const dbRLSImport = `import { queryWithRLS, AuthenticatedRequest } from '../../infra/database/db-rls';`;

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      refactorFile(fullPath);
    }
  }
}

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace db import with queryWithRLS
  content = content.replace(/import\s+(\w+)\s+from\s+['"](?:\.\.\/)+infra\/database\/db['"];/g, dbRLSImport);
  
  // Update query calls: db.query(...) to queryWithRLS(req as AuthenticatedRequest, ...)
  // Note: the regex assumes that db object was named 'db' or whatever matched. usually it is 'db'.
  content = content.replace(/db\.query\((.*?)\)/g, 'queryWithRLS(req as AuthenticatedRequest, $1)');

  // Tables renaming
  content = content.replace(/\bclientes\b/g, 'customers');
  content = content.replace(/\bfuncionarios\b/g, 'tenant_users');
  content = content.replace(/\brecompensas\b/g, 'rewards');
  content = content.replace(/\btransacoes\b/g, 'transactions');
  content = content.replace(/\bresgates\b/g, 'redemptions');
  content = content.replace(/\bconfiguracoes\b/g, 'tenant_settings');

  // Columns renaming in strings and variables (risky but generally works if matching typical patterns)
  content = content.replace(/\bcpf\b/g, 'document');
  content = content.replace(/\bpontos_totais\b/g, 'total_points');
  content = content.replace(/\bdata_criacao\b/g, 'created_at');
  // ... more replacements as needed.

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Refactored ${filePath}`);
}

walkDir(srcDir);