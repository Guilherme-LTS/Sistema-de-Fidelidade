// frontend/src/components/Pagination.js
import React from 'react';
import styles from './Pagination.module.css';

function Pagination({ paginaAtual, totalPaginas, onPageChange }) {
  if (totalPaginas <= 1) {
    return null; // Não mostra a paginação se houver apenas uma página
  }

  return (
    <div className={styles.paginationContainer}>
      <button
        onClick={() => onPageChange(paginaAtual - 1)}
        disabled={paginaAtual === 1}
        className={styles.button}
      >
        Anterior
      </button>
      <span className={styles.pageInfo}>
        Página {paginaAtual} de {totalPaginas}
      </span>
      <button
        onClick={() => onPageChange(paginaAtual + 1)}
        disabled={paginaAtual === totalPaginas}
        className={styles.button}
      >
        Próximo
      </button>
    </div>
  );
}

export default Pagination;
