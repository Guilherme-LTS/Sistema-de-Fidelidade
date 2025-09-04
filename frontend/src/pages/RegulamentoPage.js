// frontend/src/pages/RegulamentoPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './RegulamentoPage.module.css';

function RegulamentoPage() {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.content}>
        <h1>Regulamento do Programa de Fidelidade & Política de Privacidade</h1>
        <p><strong>Última atualização: 03 de Setembro de 2025</strong></p>
        <p>Bem-vindo ao nosso programa de fidelidade! Ao se cadastrar, você concorda com os termos e condições descritos abaixo.</p>

        <h3>1. Como Funciona o Programa</h3>
        <ul>
          <li>A cada R$ 1,00 (um real) gasto em consumo no nosso estabelecimento, você ganha 1 (um) ponto.</li>
          <li>Os pontos são pessoais, intransferíveis e vinculados ao seu CPF.</li>
          <li>Para pontuar, o CPF deve ser informado ao operador de caixa no momento do pagamento.</li>
        </ul>

        <h3>2. Liberação e Validade dos Pontos</h3>
        <ul>
          <li><strong>Liberação:</strong> Os pontos ganhos em uma transação ficarão disponíveis para resgate após um período de 2 (dois) dias a contar da data da transação.</li>
          <li><strong>Validade:</strong> Cada ponto creditado terá a validade de 90 (noventa) dias. Após este período, os pontos expiram e são zerados do saldo.</li>
          <li>É de responsabilidade do cliente acompanhar o saldo e a data de vencimento de seus pontos.</li>
        </ul>

        <h3>3. Resgate de Recompensas</h3>
        <ul>
          <li>As recompensas disponíveis e seus respectivos custos em pontos estão listados em nosso estabelecimento e podem ser consultados em nosso site.</li>
          <li>Para resgatar um prêmio, o cliente deve ter o saldo de pontos disponíveis suficiente e apresentar um documento de identificação com o CPF.</li>
          <li>Uma vez resgatados, os pontos não poderão ser estornados.</li>
        </ul>

        <h3>4. Política de Privacidade e LGPD (Lei Geral de Proteção de Dados)</h3>
        <p>Nós levamos a sua privacidade a sério. Esta política descreve como coletamos e utilizamos seus dados.</p>
        <ul>
          <li><strong>Dados Coletados:</strong> Coletamos apenas seu nome completo e CPF para a finalidade exclusiva de administrar sua participação no programa de fidelidade.</li>
          <li><strong>Finalidade do Uso:</strong> Seus dados são utilizados para identificar sua conta no sistema, creditar e debitar pontos, e permitir a consulta de saldo e o resgate de prêmios.</li>
          <li><strong>Armazenamento:</strong> Seus dados são armazenados de forma segura e não são compartilhados com terceiros para fins de marketing ou qualquer outra finalidade não descrita neste regulamento.</li>
          <li><strong>Seus Direitos:</strong> Como titular dos dados, você tem o direito de solicitar o acesso, a correção ou a exclusão de suas informações do nosso sistema a qualquer momento. A exclusão dos dados implicará no cancelamento da sua participação no programa.</li>
        </ul>
        <p>Ao marcar a caixa de consentimento no cadastro, você declara que leu, compreendeu e concorda com todos os termos deste regulamento e com nossa política de privacidade.</p>
        
        <Link to="/cadastro" className={styles.backLink}>&larr; Voltar para o Cadastro</Link>
      </div>
    </div>
  );
}

export default RegulamentoPage;
