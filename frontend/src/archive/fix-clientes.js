const fs = require('fs');

let c = fs.readFileSync('features/clientes/ClientesPage.tsx', 'utf8');

c = c.replace(/const response = await fetch\(url, \{\s*headers:\s*\{\s*'Authorization':\s*`Bearer \$\{token\}`\s*\},\s*\}\);/, "const response = await api.get(url.replace(process.env.REACT_APP_API_URL, ''));");
c = c.replace(/const data = await response\.json\(\);/g, 'const data = response.data;');
c = c.replace(/if \(!response\.ok\) throw new Error\(data\.error \|\| 'Erro ao buscar clientes'\);/, '');
c = c.replace(/fetch\(`\$\{process\.env\.REACT_APP_API_URL\}\/clientes\/\$\{cpfLimpo\}`,\s*\{\s*headers:\s*\{\s*'Authorization':\s*`Bearer \$\{token\}`\s*\}\s*\}\)/g, 'api.get(`/clientes/${cpfLimpo}`)');
c = c.replace(/fetch\(`\$\{process\.env\.REACT_APP_API_URL\}\/clientes\/\$\{cpfLimpo\}\/extrato`,\s*\{\s*headers:\s*\{\s*'Authorization':\s*`Bearer \$\{token\}`\s*\}\s*\}\)/g, 'api.get(`/clientes/${cpfLimpo}/extrato`)');
c = c.replace(/if \(!deleteResponse\.ok \|\| !extratoResponse\.ok\)\s*\{\s*throw new Error\('Falha ao verificar cliente para exclusã\?o\.'\);\s*\}/g, '');
c = c.replace(/const clienteData = await deleteResponse\.json\(\);/g, 'const clienteData = deleteResponse.data;');
c = c.replace(/const extratoData = await extratoResponse\.json\(\);/g, 'const extratoData = extratoResponse.data;');
c = c.replace(/const confirmDelete = window.confirm\(`Tem certeza que deseja excluir o cliente \$\{clienteData\.nome\}\?.*?\`\);/g, 'const confirmDelete = window.confirm(`Tem certeza que deseja excluir o cliente ${clienteData.nome}?`);');

c = c.replace(/const res = await fetch\(`\$\{process\.env\.REACT_APP_API_URL\}\/clientes\/\$\{cpfLimpo\}`,\s*\{\s*method:\s*'DELETE',\s*headers:\s*\{\s*'Authorization':\s*`Bearer \$\{token\}`\s*\},\s*\}\);/, 'await api.delete(`/clientes/${cpfLimpo}`);');
c = c.replace(/if \(!res\.ok\) \{\s*const errData = await res\.json\(\);\s*throw new Error\(errData\.error \|\| 'Falha ao excluir\.'\);\s*\}/g, '');

c = c.replace(/catch \(error\)/g, 'catch (error: any)');

// Check token usage
c = c.replace(/const token = localStorage\.getItem\('token'\);\s*/g, '');

fs.writeFileSync('features/clientes/ClientesPage.tsx', c);
