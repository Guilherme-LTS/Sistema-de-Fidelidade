// frontend/src/components/ResgateRecompensa.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './ResgateRecompensa.css';

function ResgateRecompensa() {
  const [cpf, setCpf] = useState('');
  const [recompensas, setRecompensas] = useState([]);
  const [selectedRecompensa, setSelectedRecompensa] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Efeito para buscar as recompensas disponíveis quando o componente montar
  useEffect(() => {
    const fetchRecompensas = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/recompensas`);
        const data = await response.json();
        if (!response.ok) throw new Error('Falha ao buscar recompensas');
        setRecompensas(data);
      } catch (error) {
        toast.error(error.message);
      }
    };
    fetchRecompensas();
  }, []);

  const formatarCPF = (valor) => {
    return valor.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleResgate = async (e) => {
    e.preventDefault();
    if (!selectedRecompensa) {
      toast.warn('Por favor, selecione uma recompensa.');
      return;
    }
    setCarregando(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/resgates`, {
      // const response = await fetch('https://sistema-fidelidade-api.onrender.com/resgates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, ''), recompensa_id: selectedRecompensa })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(`Resgate realizado! Pontos restantes: ${data.pontos_restantes}`);
      setCpf('');
      setSelectedRecompensa('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="resgate-container">
      <h2>Resgatar Recompensa</h2>
      <form onSubmit={handleResgate}>
        <div className="form-group">
          <label htmlFor="cpf-resgate">CPF do Cliente</label>
          <input type="text" id="cpf-resgate" value={cpf} onChange={e => setCpf(formatarCPF(e.target.value))} placeholder="000.000.000-00" maxLength="14" required />
        </div>

        <div className="form-group">
          <label htmlFor="recompensa-select">Selecione a Recompensa</label>
          <select id="recompensa-select" value={selectedRecompensa} onChange={e => setSelectedRecompensa(e.target.value)} required>
            <option value="" disabled>-- Escolha uma recompensa --</option>
            {recompensas.map(rec => (
              <option key={rec.id} value={rec.id}>
                {rec.nome} ({rec.custo_pontos} pontos)
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={carregando}>
          {carregando ? 'Processando...' : 'Confirmar Resgate'}
        </button>
      </form>
    </div>
  );
}

export default ResgateRecompensa;