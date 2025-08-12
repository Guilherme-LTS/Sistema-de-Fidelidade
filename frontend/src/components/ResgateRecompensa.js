// frontend/src/components/ResgateRecompensa.js
import React, { useState, useEffect } from 'react'; // Adicionado useEffect
import { toast } from 'react-toastify';
import styles from './ResgateRecompensa.module.css';
import useDebounce from '../hooks/useDebounce'; // Importe nosso hook

function ResgateRecompensa() {
  const [cpf, setCpf] = useState('');
  const [recompensas, setRecompensas] = useState([]);
  const [selectedRecompensa, setSelectedRecompensa] = useState('');
  const [carregando, setCarregando] = useState(false);

  // --- NOVOS ESTADOS PARA O FEEDBACK ---
  const [clienteInfo, setClienteInfo] = useState(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  const debouncedCpf = useDebounce(cpf, 500);

  // --- LÓGICA DE BUSCA DO CLIENTE ---
  useEffect(() => {
    const buscarCliente = async () => {
      const cpfLimpo = debouncedCpf.replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        setClienteInfo(null);
        return;
      }

      setBuscandoCliente(true);
      setClienteInfo(null);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL}/clientes/${cpfLimpo}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const data = await response.json();
        if (response.ok) {
          setClienteInfo(data);
        } else {
          setClienteInfo({ error: data.error || 'Cliente não encontrado.' });
        }
      } catch (error) {
        setClienteInfo({ error: 'Erro de conexão.' });
      } finally {
        setBuscandoCliente(false);
      }
    };

    if (debouncedCpf) {
      buscarCliente();
    }
  }, [debouncedCpf]);


  // Efeito para buscar as recompensas
  useEffect(() => {
    const fetchRecompensas = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL}/recompensas`,{
          headers: { 'Authorization': `Bearer ${token}` },
        });
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/resgates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, ''), recompensa_id: selectedRecompensa })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success(`Resgate realizado! Pontos restantes: ${data.pontos_restantes}`);
      setCpf('');
      setSelectedRecompensa('');
      setClienteInfo(null); // Limpa o feedback
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <form onSubmit={handleResgate} className={styles.formContainer}>
      <h2 className={styles.heading}>Resgatar Recompensa</h2>
      <div className={styles.stack}>
        <div className={styles.formGroup}>
          <label htmlFor="cpf-resgate" className={styles.label}>CPF do Cliente</label>
          <input 
            type="text" 
            id="cpf-resgate" 
            className={styles.input}
            value={cpf} 
            onChange={e => setCpf(formatarCPF(e.target.value))} 
            placeholder="000.000.000-00" 
            maxLength="14" 
            required 
          />
          {/* --- NOVA ÁREA DE FEEDBACK --- */}
          <div className={styles.feedbackArea}>
            {buscandoCliente && <p>Buscando cliente...</p>}
            {clienteInfo && !clienteInfo.error && (
              <p className={styles.clienteInfo}>
                Cliente: <strong>{clienteInfo.nome || 'Não cadastrado'}</strong> | Saldo: <strong>{clienteInfo.pontosDisponiveis || 0} pts</strong>
              </p>
            )}
            {clienteInfo && clienteInfo.error && (
              <p className={styles.clienteErro}>{clienteInfo.error}</p>
            )}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="recompensa-select" className={styles.label}>Selecione a Recompensa</label>
          <select 
            id="recompensa-select" 
            className={styles.select}
            value={selectedRecompensa} 
            onChange={e => setSelectedRecompensa(e.target.value)} 
            required
          >
            <option value="" disabled>-- Escolha uma recompensa --</option>
            {recompensas.map(rec => (
              <option key={rec.id} value={rec.id}>
                {rec.nome} ({rec.custo_pontos} pontos)
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className={styles.button} disabled={carregando || (clienteInfo && clienteInfo.error)}>
          {carregando ? 'Processando...' : 'Confirmar Resgate'}
        </button>
      </div>
    </form>
  );
}

export default ResgateRecompensa;