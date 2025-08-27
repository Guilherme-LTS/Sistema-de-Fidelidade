// frontend/src/pages/PremiosPage.js

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './PremiosPage.module.css';
import Spinner from '../components/Spinner';

function PremiosPage() {
  const [recompensas, setRecompensas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para o formulário (modal)
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecompensa, setCurrentRecompensa] = useState({ id: null, nome: '', descricao: '', custo_pontos: '' });

  const token = localStorage.getItem('token');

  // Função para buscar as recompensas
  const fetchRecompensas = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/recompensas`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error('Falha ao buscar recompensas');
      setRecompensas(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecompensas();
  }, []);

  const handleOpenModal = (recompensa = null) => {
    if (recompensa) {
      setIsEditing(true);
      setCurrentRecompensa(recompensa);
    } else {
      setIsEditing(false);
      setCurrentRecompensa({ id: null, nome: '', descricao: '', custo_pontos: '' });
    }
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentRecompensa(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const dadosParaEnviar = { ...currentRecompensa };

    const url = isEditing 
      ? `${process.env.REACT_APP_API_URL}/recompensas/${dadosParaEnviar.id}`
      : `${process.env.REACT_APP_API_URL}/recompensas`;
    
    const method = isEditing ? 'PUT' : 'POST';

    if (!isEditing) {
      delete dadosParaEnviar.id;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        // 3. Enviamos a cópia corrigida
        body: JSON.stringify(dadosParaEnviar),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha ao salvar recompensa.');
      }
      
      toast.success(`Recompensa ${isEditing ? 'atualizada' : 'criada'} com sucesso!`);
      fetchRecompensas();
      handleCloseModal();
    } catch (error) {
      toast.error(error.message);
    }
};
  
  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta recompensa?')) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/recompensas/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Falha ao excluir recompensa.');
        }
        
        toast.success('Recompensa excluída com sucesso!');
        fetchRecompensas(); // Atualiza a lista
      } catch (error) {
        toast.error(error.message);
      }
    }
  };


  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.spinnerContainer}>
          <Spinner size="large" />
        </div>
      </div>
    );
  }


  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Gerenciar Prêmios</h1>
        <button className={styles.addButton} onClick={() => handleOpenModal()}>
          Adicionar Novo Prêmio
        </button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Descrição</th>
            <th>Custo (Pontos)</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {recompensas.map(rec => (
            <tr key={rec.id}>
              <td>{rec.nome}</td>
              <td>{rec.descricao}</td>
              <td>{rec.custo_pontos}</td>
              <td>
                <div className={styles.actions}>
                  <button className={styles.editButton} onClick={() => handleOpenModal(rec)}>Editar</button>
                  <button className={styles.deleteButton} onClick={() => handleDelete(rec.id)}>Excluir</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Modal para Adicionar/Editar */}
      {isOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <h2>{isEditing ? 'Editar Prêmio' : 'Adicionar Novo Prêmio'}</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Nome do Prêmio</label>
                <input 
                  type="text" 
                  name="nome" 
                  value={currentRecompensa.nome} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className={styles.formGroup}>
                <label>Descrição (Opcional)</label>
                <input 
                  type="text" 
                  name="descricao" 
                  value={currentRecompensa.descricao} 
                  onChange={handleChange} 
                />
              </div>
              <div className={styles.formGroup}>
                <label>Custo em Pontos</label>
                <input 
                  type="number" 
                  name="custo_pontos" 
                  value={currentRecompensa.custo_pontos} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={handleCloseModal}>Cancelar</button>
                <button type="submit" className={styles.saveButton}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PremiosPage;
