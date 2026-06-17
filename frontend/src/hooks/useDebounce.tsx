// frontend/src/hooks/useDebounce.js
import { useState, useEffect } from 'react';

// Este hook recebe um valor e um tempo de atraso (delay)
function useDebounce(value, delay) {
  // Estado para guardar o valor "atrasado"
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Cria um temporizador que só vai atualizar o estado
    // depois que o 'delay' tiver passado
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpa o temporizador se o valor mudar (ex: o usuário digitou outra letra)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Roda o efeito de novo se o valor ou o delay mudarem

  return debouncedValue;
}

export default useDebounce;