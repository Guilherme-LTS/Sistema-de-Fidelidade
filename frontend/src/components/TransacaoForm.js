// frontend/src/components/TransacaoForm.js
import React, { useState, useEffect } from 'react'; // 1. Adicionado useEffect
import { toast } from 'react-toastify';
import styles from './TransacaoForm.module.css';
import useDebounce from '../hooks/useDebounce'; // 2. Importamos nosso novo hook

function TransacaoForm() {
  const [cpf, setCpf] = useState('');
  const [valor, setValor] = useState('');
  const [nome, setNome] = useState('');
  const [carregando, setCarregando] = useState(false);


  // --- NOVA SEÇÃO DE ESTADOS ---
  const [clienteInfo, setClienteInfo] = useState(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  // --- FIM DA NOVA SEÇÃO ---

  const debouncedCpf = useDebounce(cpf, 500); // Atraso de 500ms

  // --- NOVA FUNÇÃO useEffect ---
  // Roda sempre que o CPF "atrasado" muda
  useEffect(() => {
    const buscarCliente = async () => {
      const cpfLimpo = debouncedCpf.replace(/\D/g, '');
      // Só busca se o CPF tiver 11 dígitos
      if (cpfLimpo.length !== 11) {
        setClienteInfo(null);
        return;
      }

      setBuscandoCliente(true);
      setClienteInfo(null); // Limpa a informação anterior
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL}/clientes/${cpfLimpo}`, {
          headers: { 'Authorization': `Bearer ${token}` }, // Rota protegida
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
  // --- FIM DA NOVA FUNÇÃO ---


  // Sua função de formatar CPF (mantida 100% intacta)
  const formatarCPF = (valor) => {
    const cpfLimpo = valor.replace(/\D/g, '');
    const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d)/, '$1.$2')
                                  .replace(/(\d{3})(\d)/, '$1.$2')
                                  .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return cpfFormatado;
  };

  const handleCpfChange = (e) => {
    const valorFormatado = formatarCPF(e.target.value);
    setCpf(valorFormatado);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setCarregando(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/transacoes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Rota protegida
        },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, ''), valor: parseFloat(valor), nome }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ocorreu um erro na requisição.');
      }

      toast.success(`Pontos registrados com sucesso! Pontos ganhos: ${data.pontosGanhos}`);
      setCpf('');
      setValor('');
      setNome('');
      setClienteInfo(null); // Limpa a informação do cliente após o sucesso
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.formContainer}>
      <h2 className={styles.heading}>
        Lançar Pontos
      </h2>
      <div className={styles.stack}>
        <div className={styles.formGroup}>
          <label htmlFor="cpf" className={styles.label}>CPF do Cliente</label>
          <input
            type="text"
            id="cpf"
            className={styles.input}
            value={cpf}
            onChange={handleCpfChange}
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
          {/* --- FIM DA NOVA ÁREA --- */}
        </div>


        {/* ADICIONE ESTE BLOCO NOVO */}
        {clienteInfo && clienteInfo.error && (
          <div className={styles.formGroup}>
            <label htmlFor="nome" className={styles.label}>Nome do Novo Cliente</label>
            <input
              type="text"
              id="nome"
              className={styles.input}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite o nome do cliente"
              required
            />
          </div>
        )}


        <div className={styles.formGroup}>
          <label htmlFor="valor" className={styles.label}>Valor da Compra (R$)</label>
          <input
            type="number"
            id="valor"
            className={styles.input}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Ex: 150.75"
            step="0.01"
            min="0"
            required
          />
        </div>

        <button
          type="submit"
          className={styles.button}
          disabled={carregando}
        >
          {carregando ? 'Processando...' : 'Lançar Pontos'}
        </button>
      </div>
    </form>
  );
}

export default TransacaoForm;