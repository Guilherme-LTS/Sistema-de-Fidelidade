const fs = require('fs');

const css = `.pageContainer {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.title {
  color: #1a202c;
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
}

.buttonNew {
  background-color: #3182ce;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.buttonNew:hover {
  background-color: #2b6cb0;
}

.panel, .panelForm {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.subTitle {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #2d3748;
}

.formGroup {
  margin-bottom: 1.5rem;
}

.label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #4a5568;
}

.input, .select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.input:focus, .select:focus {
  outline: none;
  border-color: #3182ce;
  box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.button {
  background-color: #3182ce;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  flex: 1;
}

.button:hover {
  background-color: #2b6cb0;
}

.button:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
}

.buttonCancel {
  background-color: #e2e8f0;
  color: #4a5568;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.buttonCancel:hover {
  background-color: #cbd5e0;
}

/* Tabela de Usuários */
.tableContainer {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  padding: 1rem;
  border-bottom: 2px solid #e2e8f0;
  color: #4a5568;
  font-weight: 600;
}

.table td {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  color: #2d3748;
  vertical-align: middle;
}

.inactiveRow {
  background-color: #fff5f5;
  opacity: 0.8;
}

.badgeAdmin, .badgeOperador, .badgeActive, .badgeInactive {
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-block;
}

.badgeAdmin {
  background-color: #ebf4ff;
  color: #2b6cb0;
}

.badgeOperador {
  background-color: #edf2f7;
  color: #4a5568;
}

.badgeActive {
  background-color: #c6f6d5;
  color: #22543d;
}

.badgeInactive {
  background-color: #fed7d7;
  color: #9b2c2c;
}

.actionCells {
  display: flex;
  gap: 0.5rem;
}

.btnAction {
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 0.4rem;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btnAction:hover {
  background-color: #edf2f7;
  border-color: #cbd5e0;
}

.btnDelete:hover {
  background-color: #fed7d7;
  border-color: #f56565;
  color: #c53030;
}
`;

fs.writeFileSync('C:/Users/Gui/Documents/GitHub/Sistema-de-Fidelidade/frontend/src/features/usuarios/UsuariosPage.module.css', css, 'utf8');
