import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';

function AlterarSenhaPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const recoveryMode = searchParams.get('recovery') === '1';

  const [email, setEmail] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email || '');
      setSessionReady(Boolean(data.user));
    };

    void loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email || '');
      setSessionReady(Boolean(session?.user));
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (novaSenha.length < 6) {
      toast.warning('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmacaoSenha) {
      toast.warning('A confirmação não confere com a nova senha.');
      return;
    }

    if (!recoveryMode && (!email || !senhaAtual)) {
      toast.warning('Informe sua senha atual para confirmar a alteração.');
      return;
    }

    setCarregando(true);
    try {
      if (!recoveryMode) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: senhaAtual,
        });

        if (signInError) {
          throw new Error('Senha atual inválida.');
        }
      }

      const { data, error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) {
        throw new Error(error.message);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.access_token) {
        localStorage.setItem('token', sessionData.session.access_token);
      }

      toast.success('Senha atualizada com sucesso.');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmacaoSenha('');

      if (data.user && !recoveryMode) {
        navigate('/admin/operacoes');
      } else {
        navigate('/login');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar senha.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200 bg-white">
        <CardHeader className="space-y-1 text-center mb-4">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 bg-teal-100 rounded-full flex items-center justify-center">
              <KeyRound className="h-6 w-6 text-teal-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            {recoveryMode ? 'Definir nova senha' : 'Alterar minha senha'}
          </CardTitle>
          <CardDescription className="text-slate-500">
            {recoveryMode
              ? 'Crie uma nova senha para voltar a acessar o sistema.'
              : 'Confirme sua senha atual e escolha uma nova senha segura.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!sessionReady && recoveryMode ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Abra esta página pelo link recebido por e-mail para continuar a redefinição.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!recoveryMode && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium leading-none text-slate-700">
                      Email
                    </label>
                    <Input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="senhaAtual" className="text-sm font-medium leading-none text-slate-700">
                      Senha atual
                    </label>
                    <Input
                      type="password"
                      id="senhaAtual"
                      value={senhaAtual}
                      onChange={(event) => setSenhaAtual(event.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label htmlFor="novaSenha" className="text-sm font-medium leading-none text-slate-700">
                  Nova senha
                </label>
                <Input
                  type="password"
                  id="novaSenha"
                  value={novaSenha}
                  onChange={(event) => setNovaSenha(event.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmacaoSenha" className="text-sm font-medium leading-none text-slate-700">
                  Confirmar nova senha
                </label>
                <Input
                  type="password"
                  id="confirmacaoSenha"
                  value={confirmacaoSenha}
                  onChange={(event) => setConfirmacaoSenha(event.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={carregando}>
                {carregando ? 'Salvando...' : 'Salvar nova senha'}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-slate-100 pt-4 mt-2">
          <Link
            to={recoveryMode ? '/login' : '/admin/operacoes'}
            className="flex items-center text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {recoveryMode ? 'Voltar para login' : 'Voltar ao painel'}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default AlterarSenhaPage;
