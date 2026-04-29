import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { Store, User, Mail, Lock, ArrowLeft } from "lucide-react";

function CadastroPage() {
  const [tenantName, setTenantName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenantName || !adminName || !email || !password) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (password.length < 6) {
      toast.error("Sua senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setCarregando(true);

    try {
      // Chama nosso novo endpoint transacional B2B de provisionamento atômico
      await api.post("/auth/register-tenant", {
        tenant_name: tenantName,
        admin_name: adminName,
        email: email,
        password: password,
        document: document || null
      });

      toast.success("Restaurante cadastrado com sucesso! Faça login para continuar.");
      navigate("/login");
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Erro ao criar sua conta. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-start justify-center overflow-x-hidden bg-white px-4 py-6 sm:items-center">
      <Card className="w-full max-w-md overflow-hidden shadow-xl border-slate-200 bg-white">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 ring-4 ring-white shadow-sm">
            <Store className="h-7 w-7 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800 tracking-tight">
            Crie seu Programa de Fidelidade
          </CardTitle>
          <CardDescription className="text-slate-500 mt-2">
            Preencha os dados abaixo para criar o Painel Gerencial do seu estabelecimento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">Nome do Estabelecimento *</label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  required
                  placeholder="Ex: Pizzaria do Mario"
                  className="w-full pl-10"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">Seu Nome Completo (Gestor) *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  required
                  placeholder="Ex: Mario Silva"
                  className="w-full pl-10"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">CNPJ / CPF do Negócio (Opcional)</label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Apenas números"
                  className="w-full"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">E-mail Profissional *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  required
                  placeholder="contato@pizzaria.com"
                  className="w-full pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">Crie uma Senha *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Mínio 6 caracteres"
                  className="w-full pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-6 bg-green-600 hover:bg-green-700 transition duration-300 shadow-md py-6 text-md font-semibold font-sans"
              disabled={carregando}
            >
              {carregando ? "Gerando Ambiente..." : "Finalizar Cadastro B2B"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-center border-t border-slate-100 pt-5 mt-2 pb-5 text-center">
          <p className="text-sm text-slate-600">
            Já possui uma conta gerenciadora?{" "}
            <Link to="/login" className="font-bold text-green-600 hover:underline">
              Faça login
            </Link>
          </p>
          <Link
            to="/"
            className="flex items-center text-xs font-medium mt-4 text-slate-400 hover:text-green-600 transition-colors"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Voltar para página institucional
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default CadastroPage;
