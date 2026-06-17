const fs = require('fs');
let code = fs.readFileSync('src/features/clientes/ConsultaSaldo.tsx', 'utf8');

const regex = /try\s*\{\s*const response = await api\.get\(`\/clientes\/\$\{cpfLimpo\}`\);[\s\S]*?\} catch \(error: any\) \{[\s\S]*?toast\.error\(error\.message\);\s*\} finally \{/;

const novoCode = `try {
      const response = await api.get(\`/clientes/\${cpfLimpo}\`);
      const data = response.data;
      setCliente(data);
      if (onConsulta) {
        onConsulta(data.pontosDisponiveis);
      }
    } catch (error: any) {
      setCliente(null);
      if (error.response?.status === 404) {
        if (onNotFound) {
          onNotFound();
        } else {
          toast.error('Cliente não encontrado.');
        }
      } else {
        toast.error(error.response?.data?.error || error.message);
      }
    } finally {`;

code = code.replace(regex, novoCode);
fs.writeFileSync('src/features/clientes/ConsultaSaldo.tsx', code);
console.log('ConsultaSaldo atualizado.');
