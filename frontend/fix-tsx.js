const fs = require('fs');

const files = [
  'src/components/ConsultaSaldo.tsx',
  'src/components/ResgateRecompensa.tsx',
  'src/components/TransacaoForm.tsx',
  'src/pages/CadastroPage.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let text = fs.readFileSync(f, 'utf8');
    text = text.replace(/maxLength="14"/g, 'maxLength={14}');
    text = text.replace(/maxLength="11"/g, 'maxLength={11}');
    fs.writeFileSync(f, text);
  }
});

let op = fs.readFileSync('src/pages/OperacoesPage.tsx', 'utf8');
op = op.replace('<ConsultaSaldo />', '<ConsultaSaldo onConsulta={() => {}} onNotFound={() => {}} />');
fs.writeFileSync('src/pages/OperacoesPage.tsx', op);

let prm = fs.readFileSync('src/pages/PremiosPage.tsx', 'utf8');
prm = prm.replace(/colSpan="4"/g, 'colSpan={4}');
fs.writeFileSync('src/pages/PremiosPage.tsx', prm);
