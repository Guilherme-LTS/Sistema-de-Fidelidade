const fs = require('fs');
let code = fs.readFileSync('src/features/transacoes/TransacaoForm.tsx', 'utf8');

const regex = /try\s*\{[\s\S]*?const response = await api\.get\(`\/clientes\/\$\{cpfLimpo\}`\);[\s\S]*?const data = response\.data;[\s\S]*?if\s*\(true\)\s*\{[\s\S]*?setClienteInfo\(data\);[\s\S]*?\}\s*else\s*\{[\s\S]*?setClienteInfo\(\{ error: data\.error \|\| 'Cliente não encontrado\.' \}\);[\s\S]*?\}[\s\S]*?\}\s*catch\s*\(error\)\s*\{[\s\S]*?setClienteInfo\(\{ error: 'Erro de conexão\.' \}\);[\s\S]*?\}/;

const novo = `try {
        const response = await api.get(\`/clientes/\${cpfLimpo}\`);
        setClienteInfo(response.data);
      } catch (error: any) {
        if (error.response?.status === 404) {
          setClienteInfo({ isNew: true, error: 'Novo cliente será cadastrado.' });
        } else {
          setClienteInfo({ error: 'Erro ao buscar cliente.' });
        }
      }`;

code = code.replace(regex, novo);
fs.writeFileSync('src/features/transacoes/TransacaoForm.tsx', code);
console.log('TransacaoForm atualizado.');
