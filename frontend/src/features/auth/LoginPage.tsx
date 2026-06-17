import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { supabase } from "../../services/supabase";
import { carregarPerfilAtual } from "./auth.api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { LogIn, ArrowLeft } from "lucide-react";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setCarregando(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.session) {
        toast.success("Login bem-sucedido!");
        localStorage.setItem("token", data.session.access_token);

        try {
          const perfil = await carregarPerfilAtual();
          if (perfil) {
             localStorage.setItem("userPerfil", JSON.stringify({
                id: perfil.id,
                nome: perfil.nome,
                role: perfil.role
             }));
          }
        } catch (err) {
          console.error("Erro ao buscar perfil:", err);
        }

        navigate("/admin/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao realizar login.");
    } finally {
      setCarregando(false);
    }
  };

  const handlePasswordRecovery = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email) {
      toast.warning("Informe seu e-mail para recuperar a senha.");
      return;
    }

    setCarregando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/alterar-senha?recovery=1`,
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Enviamos um link para redefinir sua senha.");
      setForgotMode(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao solicitar recuperação de senha.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200 bg-white">
        <CardHeader className="space-y-1 text-center mb-4">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <LogIn className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Acesso ao Sistema
          </CardTitle>
          <CardDescription className="text-slate-500">
            {forgotMode ? "Receba um link para criar uma nova senha" : "Identifique-se para acessar o painel de operador"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={forgotMode ? handlePasswordRecovery : handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none text-slate-700">
                Email
              </label>
              <Input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu.email@exemplo.com"
                className="w-full"
              />
            </div>
            {!forgotMode && (
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium leading-none text-slate-700">
                  Senha
                </label>
                <Input
                  type="password"
                  id="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
            )}
            <Button
              type="submit"
              className="w-full mt-6 bg-green-600 hover:bg-green-700"
              disabled={carregando}
            >
              {carregando ? "Processando..." : forgotMode ? "Enviar link de recuperação" : "Entrar"}
            </Button>
          </form>
          <button
            type="button"
            className="mt-4 w-full text-center text-sm font-medium text-green-700 hover:text-green-800"
            onClick={() => setForgotMode((current) => !current)}
          >
            {forgotMode ? "Voltar para login" : "Esqueci minha senha"}
          </button>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-100 pt-4 mt-2">
          <Link 
            to="/" 
            className="flex items-center text-sm font-medium text-slate-600 hover:text-green-600 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a página inicial
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default LoginPage;
