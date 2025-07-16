// frontend/src/components/TransacaoForm.js
import React, { useState } from 'react';

function TransacaoForm() {
  // 1. Estados para os campos do formulário
  const [cpf, setCpf] = useState('');
  const [valor, setValor] = useState('');

  // 2. Estados para feedback ao usuário
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // 3. Função para formatar CPF
  const formatarCPF = (valor) => {
    // Remove tudo que não é dígito
    const cpfLimpo = valor.replace(/\D/g, '');
    
    // Aplica a máscara
    const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d)/, '$1.$2')
                                 .replace(/(\d{3})(\d)/, '$1.$2')
                                 .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    
    return cpfFormatado;
  };

  // 4. Função para lidar com mudança no CPF
  const handleCpfChange = (e) => {
    const valorFormatado = formatarCPF(e.target.value);
    setCpf(valorFormatado);
  };

  // 5. Função para lidar com o envio do formulário
  const handleSubmit = async (event) => {
    event.preventDefault(); // Impede o recarregamento da página
    setCarregando(true);
    setMensagem('');
    setErro('');

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
        // Se a resposta não for de sucesso (ex: 400, 500)
        throw new Error(data.error || 'Ocorreu um erro na requisição.');
      }

      // Se a resposta for de sucesso
      setMensagem(`Pontos registrados com sucesso! Pontos ganhos: ${data.pontosGanhos}`);
      setCpf(''); // Limpa os campos após o sucesso
      setValor('');

    } catch (error) {
      setErro(error.message);
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

      {/* Exibição de mensagens de feedback */}
      {mensagem && <p className="mensagem-sucesso">{mensagem}</p>}
      {erro && <p className="mensagem-erro">{erro}</p>}
    </form>
  );
}

export default TransacaoForm;