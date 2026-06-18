import React from "react";
import { User, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";

const PerfilUsuarioTab = () => {
  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" /> Meus Dados
          </CardTitle>
          <CardDescription>
            Gerencie suas informações pessoais. (Em breve)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-500">
            Esta área será destinada para edição de nome, e-mail e preferências pessoais do usuário logado.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Lock className="h-5 w-5 text-indigo-600" /> Segurança
          </CardTitle>
          <CardDescription>
            Alteração de senha e autenticação. (Em breve)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-500">
            Esta área será destinada para atualizar sua senha e configurar métodos de segurança adicionais.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerfilUsuarioTab;
