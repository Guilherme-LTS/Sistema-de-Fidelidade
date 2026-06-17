import React from 'react';
import AppProviders from './app/AppProviders';
import AppRoutes from './app/AppRoutes';

function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}

export default App;
