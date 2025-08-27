// frontend/src/components/Spinner.js
import React from 'react';
import styles from './Spinner.module.css';

// O 'size' é uma propriedade que podemos usar para controlar o tamanho
const Spinner = ({ size = 'medium' }) => {
  const spinnerClass = `${styles.spinner} ${styles[size]}`;
  return <div className={spinnerClass}></div>;
};

export default Spinner;