// frontend/src/pages/ClientesPage.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './ClientesPage.module.css';
import useDebounce from '../hooks/useDebounce';
import Spinner from '../components/Spinner';
import Pagination from '../components/Pagination';

const formatarData = (dataISO) => {
  if (!dataISO) return '';
  const data = new Date(dataISO);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [termoBusca, setTermoBusca] = useState('');
  const debouncedBusca = useDebounce(termoBusca, 500);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [extrato, setExtrato] = useState([]);
  const [loadingExtrato, setLoadingExtrato] = useState(false);

  const token = localStorage.getItem('token');

  // Efeito para buscar clientes (agora depende da página e da busca)
  useEffect(() => {
    const fetchClientes = async () => {
      setLoading(true);
      try {
        const url = `${process.env.REACT_APP_API_URL}/clientes?busca=${debouncedBusca}&page=${paginaAtual}`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error('Falha ao buscar clientes');
        
        setClientes(data.clientes || []); 
        setTotalPaginas(data.totalPaginas || 1);

      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchClientes();
  }, [debouncedBusca, paginaAtual, token]);

  // Reseta para a página 1 sempre que uma nova busca é feita
  useEffect(() => {
    setPaginaAtual(1);
  }, [debouncedBusca]);

  const handleSelecionarCliente = async (cliente) => {
    setLoadingExtrato(true);
    setClienteSelecionado(cliente);
    setExtrato([]);
    const cpfLimpo = cliente.cpf.replace(/\D/g, '');

    try {
      const [resCliente, resExtrato] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/clientes/${cpfLimpo}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${process.env.REACT_APP_API_URL}/clientes/${cpfLimpo}/extrato`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const dataCliente = await resCliente.json();
      if (!resCliente.ok) throw new Error(dataCliente.error);
      setClienteSelecionado(dataCliente);

      const dataExtrato = await resExtrato.json();
      if (!resExtrato.ok) throw new Error(dataExtrato.error);
      setExtrato(dataExtrato);

    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingExtrato(false);
    }
  };


  return (
    <div className={styles.container}>
      <h1>Clientes</h1>
      <div className={styles.searchBar}>
        <input
          type="text"
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          placeholder="Buscar cliente por nome ou CPF..."
        />
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.listaClientes}>
          {loading ? <div className={styles.spinnerContainer}><Spinner /></div> : (
            <>
              <ul>
                {clientes.map(cliente => (
                  <li 
                    key={cliente.id} 
                    onClick={() => handleSelecionarCliente(cliente)}
                    className={clienteSelecionado?.id === cliente.id ? styles.ativo : ''}
                  >
                    <span className={styles.nomeCliente}>{cliente.nome || 'Nome não cadastrado'}</span>
                    <span className={styles.cpfCliente}>{cliente.cpf}</span>
                  </li>
                ))}
              </ul>
              {/* 2. Adicione o componente de paginação */}
              <Pagination 
                paginaAtual={paginaAtual}
                totalPaginas={totalPaginas}
                onPageChange={setPaginaAtual}
              />
            </>
          )}
        </div>

        <div className={styles.detalhesCliente}>
          {loadingExtrato ? <div className={styles.spinnerContainer}><Spinner /></div> : (
            clienteSelecionado ? (
              <div>
                <h2>{clienteSelecionado.nome || `CPF ${clienteSelecionado.cpf}`}</h2>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryCard}>
                    <h4>Pontos Disponíveis</h4>
                    <p>{clienteSelecionado.pontosDisponiveis}</p>
                  </div>
                  <div className={styles.summaryCard}>
                    <h4>Pontos Pendentes</h4>
                    <p>{clienteSelecionado.pontosPendentes}</p>
                  </div>
                </div>
                <h3>Extrato Completo</h3>
                <table className={styles.extratoTable}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Pontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extrato.map((item, index) => (
                      <tr key={index}>
                        <td>{formatarData(item.data)}</td>
                        <td>{item.descricao}</td>
                        <td className={item.tipo === 'credito' ? styles.credito : styles.debito}>
                          {item.tipo === 'credito' ? `+${item.pontos}` : `-${item.pontos}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.placeholder}>
                <p>Selecione um cliente na lista para ver os detalhes.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientesPage;
