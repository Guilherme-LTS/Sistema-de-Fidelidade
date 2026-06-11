# Scripts do backend

Esta pasta concentra utilitarios operacionais e historicos do backend.

## Categorias

- `migrations/`: scripts SQL versionados para evolucao do banco.
- `test_*.js` e `test_*.ts`: validacoes manuais ou diagnosticos que dependem de ambiente local/API.
- `update-*.js`, `rewrite_*.js`, `refactor-*.js`, `fix-*.js`: scripts historicos de manutencao/refatoracao.
- `diagnose-*.ts`, `validate-*.ts`, `check-*.js`: scripts de diagnostico.
- `archive/`: scripts historicos de patch, rewrite e investigacao que nao devem ser usados em fluxo normal.

## Convencao daqui para frente

- Novas regras de negocio devem ficar em `src/modules/*/*.service.ts`, nao em scripts.
- Novas consultas reutilizaveis devem ficar em repositories ou query builders.
- Scripts novos devem ser pequenos, documentados e apontar explicitamente quais variaveis de ambiente exigem.
- Scripts temporarios devem ser removidos depois do uso ou movidos para `archive/`.

## Observacao sobre `dist/`

O projeto ainda versiona `backend/dist`. Como `npm start` executa `npm run build` antes de `node dist/server.js`, remover `dist` do Git parece viavel, mas isso deve ser feito em uma mudanca separada validando o deploy no Render.
