// frontend/src/components/TransacaoForm.js

import React, { useState } from 'react';
import { toast } from 'react-toastify'; // A importação do toast continua aqui

function TransacaoForm() {
  // 1. Estados para os campos do formulário
  const [cpf, setCpf] = useState('');
  const [valor, setValor] = useState('');

  // 2. Estados de feedback foram removidos
  // const [mensagem, setMensagem] = useState('');
  // const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // 3. Sua função de formatar CPF (mantida intacta, está ótima!)
  const formatarCPF = (valor) => {
    const cpfLimpo = valor.replace(/\D/g, '');
    const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d)/, '$1.$2')
                                  .replace(/(\d{3})(\d)/, '$1.$2')
                                  .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return cpfFormatado;
  };

  // 4. Sua função para lidar com mudança no CPF (mantida intacta)
  const handleCpfChange = (e) => {
    const valorFormatado = formatarCPF(e.target.value);
    setCpf(valorFormatado);
  };

  // 5. Função de envio atualizada para usar toasts
  const handleSubmit = async (event) => {
    event.preventDefault();
    setCarregando(true);
    // Não precisamos mais limpar mensagens aqui

    try {
      const response = await fetch('http://localhost:3001/transacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cpf: cpf.replace(/\D/g, ''), valor: parseFloat(valor) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocorreu um erro na requisição.');
      }

      // SUCESSO: Chamamos o toast de sucesso!
      toast.success(`Pontos registrados! Pontos ganhos: ${data.pontosGanhos}`);
      setCpf('');
      setValor('');

    } catch (error) {
      // ERRO: Chamamos o toast de erro!
      toast.error(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Lançar Pontos de Fidelidade</h2>

      <div className="form-group">
        <label htmlFor="cpf">CPF do Cliente</label>
        <input
          type="text"
          id="cpf"
          value={cpf}
          onChange={handleCpfChange}
          placeholder="000.000.000-00"
          maxLength="14"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="valor">Valor da Compra (R$)</label>
        <input
          type="number"
          id="valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Ex: 150.75"
          step="0.01"
          min="0"
          required
        />
      </div>

      <button type="submit" disabled={carregando}>
        {carregando ? 'Processando...' : 'Lançar Pontos'}
      </button>

      {/* As mensagens de feedback em texto foram removidas daqui */}
    </form>
  );
}

export default TransacaoForm;