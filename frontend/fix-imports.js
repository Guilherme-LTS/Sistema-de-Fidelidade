const fs = require('fs');

function fixImports(file) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  
  // DashboardPage
  code = code.replace(/from '\.\.\/components\/Dashboard'/g, "from './Dashboard'");
  
  // AdminLayout
  code = code.replace(/from '\.\.\/components\/Layout'/g, "from './Layout'");
  
  // OperacoesPage
  code = code.replace(/from '\.\.\/components\/ConsultaSaldo'/g, "from '../clientes/ConsultaSaldo'");
  code = code.replace(/from '\.\.\/components\/TransacaoForm'/g, "from './TransacaoForm'");
  code = code.replace(/from '\.\.\/auth\/auth'/g, "from '../auth/auth'");
  
  // ClientesPage
  code = code.replace(/from '\.\.\/components\/Pagination'/g, "from '../../shared/components/Pagination'");
  code = code.replace(/from '\.\.\/components\/Spinner'/g, "from '../../shared/components/Spinner'");
  
  // PremiosPage
  code = code.replace(/from '\.\.\/components\/ResgateRecompensa'/g, "from './ResgateRecompensa'");
  code = code.replace(/from '\.\.\/components\/Pagination'/g, "from '../../shared/components/Pagination'");
  code = code.replace(/from '\.\.\/components\/Spinner'/g, "from '../../shared/components/Spinner'");
  
  // LoginPage, CadastroPage
  code = code.replace(/from '\.\.\/auth\/auth'/g, "from './auth'");

  // Layouts
  code = code.replace(/from '\.\.\/auth\/auth'/g, "from '../../features/auth/auth'");

  fs.writeFileSync(file, code);
}

fixImports('src/features/DashboardPage.tsx');
fixImports('src/features/transacoes/OperacoesPage.tsx');
fixImports('src/features/clientes/ClientesPage.tsx');
fixImports('src/features/recompensas/PremiosPage.tsx');
fixImports('src/features/auth/LoginPage.tsx');
fixImports('src/features/auth/CadastroPage.tsx');
fixImports('src/shared/layouts/AdminLayout.tsx');
fixImports('src/shared/layouts/Layout.tsx');
