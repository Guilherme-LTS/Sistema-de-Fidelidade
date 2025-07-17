// frontend/src/components/ConsultaSaldo.js
import React, { useState } from 'react';
import { toast } from 'react-toastify';

function ConsultaSaldo() {
  const [cpf, setCpf] = useState('');
  const [cliente, setCliente] = useState(null); // Para guardar os dados do cliente encontrado
  const [carregando, setCarregando] = useState(false);

  const formatarCPF = (valor) => {
    // Reutilizando a mesma lógica de formatação
    return valor.replace(/\D/g, '')
                 .replace(/(\d{3})(\d)/, '$1.$2')
                 .replace(/(\d{3})(\d)/, '$1.$2')
                 .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleCpfChange = (e) => {
    setCpf(formatarCPF(e.target.value));
  };

  const handleConsulta = async (event) => {
    event.preventDefault();
    setCarregando(true);
    setCliente(null); // Limpa resultados anteriores

    const cpfLimpo = cpf.replace(/\D/g, '');

    try {
      const response = await fetch(`http://localhost:3001/clientes/${cpfLimpo}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setCliente(data); // Guarda os dados do cliente no estado
      toast.success("Cliente encontrado!");

    } catch (error) {
      setCliente(null);
      toast.error(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="consulta-container">
      <h2>Consultar Saldo de Pontos</h2>
      <form onSubmit={handleConsulta}>
        <div className="form-group">
          <label htmlFor="cpf-consulta">CPF do Cliente</label>
          <input
            type="text"
            id="cpf-consulta"
            value={cpf}
            onChange={handleCpfChange}
            placeholder="000.000.000-00"
            maxLength="14"
            required
          />
        </div>
        <button type="submit" disabled={carregando}>
          {carregando ? 'Consultando...' : 'Consultar'}
        </button>
      </form>

      {/* Área para exibir o resultado */}
      {cliente && (
        <div className="resultado-consulta">
          <h3>Dados do Cliente</h3>
          <p><strong>CPF:</strong> {formatarCPF(cliente.cpf)}</p>
          <p><strong>Pontos:</strong> {cliente.pontos_totais}</p>
        </div>
      )}
    </div>
  );
}

export default ConsultaSaldo;