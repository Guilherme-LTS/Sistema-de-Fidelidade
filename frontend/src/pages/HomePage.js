import React from 'react';
import { Box, Heading, Container, Divider } from '@chakra-ui/react';
import TransacaoForm from '../components/TransacaoForm';
import ConsultaSaldo from '../components/ConsultaSaldo';
import ResgateRecompensa from '../components/ResgateRecompensa';

function HomePage() {
  return (
    <Box textAlign="center" py={10}>
      <Container maxW="container.lg">
        <Heading as="h1" size="xl" mb={6}>
          Sistema de Fidelidade
        </Heading>
        <TransacaoForm />
        <Divider my={10} />
        <ConsultaSaldo />
        <Divider my={10} />
        <ResgateRecompensa />
      </Container>
    </Box>
  );
}

export default HomePage;