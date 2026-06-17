const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'modules');

function fixModulesErrors(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixModulesErrors(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');

      // The previous rename messed up the import for cpf-cnpj-validator because cpf was renamed to document inside 'document-cnpj-validator' which doesn't exist
      content = content.replace(/import \{ document as cpfValidator \} from 'document-cnpj-validator';/g, "import { cpf as cpfValidator } from 'cpf-cnpj-validator';");
      content = content.replace(/import \{ document as cpfValidator \}/g, "import { cpf as cpfValidator }");

      // People used db.connect() to open transactions explicitly. Let's fix that.
      // We will re-import db from the old path just to allow pool.connect() or db.connect() on that file.
      // But we will actually change db.connect() to pool.connect() and import pool.
      if (content.includes('db.connect()') || content.includes('db.query(')) {
        if (!content.includes("../../infra/database/db'")) {
          content = "import db from '../../infra/database/db';\n" + content;
        }
      }

      fs.writeFileSync(fullPath, content, 'utf-8');
    }
  }
}

fixModulesErrors(srcDir);