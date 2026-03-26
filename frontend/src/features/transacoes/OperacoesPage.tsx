// frontend/src/features/transacoes/OperacoesPage.tsx
import React from 'react';
import TransacaoForm from './TransacaoForm';
import ConsultaSaldo from '../clientes/ConsultaSaldo';
import ResgateRecompensa from '../recompensas/ResgateRecompensa';
import { getUser } from '../auth/auth';
import { Settings2 } from 'lucide-react';

function OperacoesPage() {
  const usuario = getUser() as any;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings2 className="h-8 w-8 text-blue-600" />
          Operações do Caixa
        </h1>
        <p className="text-slate-500 mt-1">Funcionalidades do dia a dia: Lançamento de pontos, saldos e resgates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
        {usuario && usuario.role === 'admin' && (
          <div className="flex flex-col gap-6">
            <TransacaoForm />
          </div>
        )}
        <div className="flex flex-col gap-6">
          <ConsultaSaldo onConsulta={() => {}} onNotFound={() => {}} />
        </div>
        <div className="flex flex-col gap-6">
          <ResgateRecompensa />
        </div>
      </div>
    </div>
  );
}

export default OperacoesPage;