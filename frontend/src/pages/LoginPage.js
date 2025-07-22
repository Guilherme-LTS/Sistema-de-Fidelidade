// frontend/src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  useToast, // O useToast original
} from '@chakra-ui/react';
import { toast as reactToastify } from 'react-toastify'; // Usando o react-toastify

function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setCarregando(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha no login.');
      }
      reactToastify.success('Login bem-sucedido!');
      localStorage.setItem('token', data.token);
      navigate('/home');
    } catch (error) {
      reactToastify.error(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Box display="flex" alignItems="center" justifyContent="center" height="100vh" bg="gray.50">
      <Container maxW="md" p={8} borderWidth={1} borderRadius="lg" boxShadow="lg" bg="white">
        <Heading as="h1" size="lg" textAlign="center" mb={6}>
          Login do Operador
        </Heading>
        <form onSubmit={handleLogin}>
          <Stack spacing={4}>
            <FormControl id="email" isRequired>
              <FormLabel>Email</FormLabel>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormControl>
            <FormControl id="password" isRequired>
              <FormLabel>Senha</FormLabel>
              <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </FormControl>
            <Button type="submit" colorScheme="blue" width="full" isLoading={carregando}>
              Entrar
            </Button>
          </Stack>
        </form>
      </Container>
    </Box>
  );
}

export default LoginPage;