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
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Settings2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">
              Operações do Caixa
            </h1>
            <p className="mt-1 text-stone-500">Funcionalidades do dia a dia: lançamento de pontos, saldos e resgates</p>
          </div>
        </div>
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