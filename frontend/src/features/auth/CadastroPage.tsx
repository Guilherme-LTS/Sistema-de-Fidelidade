import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { UserPlus, ArrowLeft } from "lucide-react";

function CadastroPage() {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const validarCPF = (cpfParaValidar: string) => {
    let limpo = cpfParaValidar.replace(/\D/g, "");
    if (limpo.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(limpo)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(limpo.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(limpo.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(limpo.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(limpo.charAt(10))) return false;

    return true;
  };

  const formatarCPF = (valor: string) => {
    return valor
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarCPF(e.target.value);
    setCpf(valorFormatado);
    if (cpfError) {
      setCpfError("");
    }
  };

  const handleCpfBlur = () => {
    if (cpf.length > 0 && !validarCPF(cpf)) {
      setCpfError("CPF inválido");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validarCPF(cpf)) {
      setCpfError("CPF inválido");
      toast.warn("Por favor, informe um CPF válido.");
      return;
    }
    if (!consentimento) {
      toast.warn("Você precisa aceitar os termos para continuar.");
      return;
    }
    setCarregando(true);
    try {
      await api.post("/clientes/cadastro", { nome, document: cpf.replace(/\D/g, ""), lgpd_consent: consentimento });
      toast.success("Cadastro realizado com sucesso! Bem-vindo(a) ao clube!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader className="space-y-1 text-center mb-2">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Faça parte do nosso Clube!
          </CardTitle>
          <CardDescription className="text-slate-500">
            Cadastre-se para começar a juntar pontos e resgatar prêmios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="nome" className="text-sm font-medium leading-none text-slate-700">
                Nome Completo
              </label>
              <Input
                type="text"
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Ex: João da Silva"
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="cpf" className="text-sm font-medium leading-none text-slate-700">
                CPF
              </label>
              <Input
                type="text"
                id="cpf"
                value={cpf}
                onChange={handleCpfChange}
                onBlur={handleCpfBlur}
                placeholder="000.000.000-00"
                maxLength={14}
                required
                className={`w-full ${cpfError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {cpfError && (
                <p className="text-xs text-red-500 font-medium">{cpfError}</p>
              )}
            </div>
            
            <div className="flex items-start space-x-3 pt-2">
              <input
                type="checkbox"
                id="consentimento"
                checked={consentimento}
                onChange={(e) => setConsentimento(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-600"
              />
              <label htmlFor="consentimento" className="text-sm text-slate-600 leading-snug cursor-pointer">
                Li e aceito o <Link to="/regulamento" target="_blank" className="font-medium text-purple-600 hover:underline">Regulamento</Link> e a Política de Privacidade.
              </label>
            </div>
            
            <Button
              type="submit"
              className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
              disabled={carregando || !consentimento || !nome || cpf.length < 14}
            >
              {carregando ? "Cadastrando..." : "Confirmar Cadastro"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-100 pt-4 mt-2">
          <Link 
            to="/" 
            className="flex items-center text-sm font-medium text-slate-600 hover:text-purple-600 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a página inicial
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default CadastroPage;
