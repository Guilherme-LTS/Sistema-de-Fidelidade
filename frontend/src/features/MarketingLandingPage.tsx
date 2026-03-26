import React from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Gift, 
  Store, 
  Star, 
  CheckCircle,
  ShieldCheck,
  Zap,
  ChevronRight
} from "lucide-react";
import { Button } from "../components/ui/button";

function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Star className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">Fidelidade<span className="text-purple-600">Pro</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#como-funciona" className="hover:text-purple-600 transition-colors">Como funciona</a>
            <a href="#beneficios" className="hover:text-purple-600 transition-colors">Benefícios</a>
            <a href="#faq" className="hover:text-purple-600 transition-colors">Dúvidas</a>
            <Link to="/regulamento" className="hover:text-purple-600 transition-colors">Regulamento</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="hidden sm:inline-flex">
                Entrar
              </Button>
            </Link>
            <Link to="/cadastro">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Cadastrar-se
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white pt-16 md:pt-24 pb-32">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-purple-500 opacity-20 blur-[100px]"></div>
          
          <div className="container mx-auto px-4 relative">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-8">
              <div className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-sm font-medium text-purple-600">
                <span className="flex h-2 w-2 rounded-full bg-purple-600 mr-2"></span>
                Novo programa de recompensas
              </div>
              
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
                Suas compras agora valem <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">prêmios incríveis</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl">
                Junte pontos a cada compra no nosso estabelecimento e troque por produtos, descontos e experiências exclusivas feitas para você.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <Link to="/cadastro">
                  <Button size="lg" className="h-12 px-8 text-base bg-purple-600 hover:bg-purple-700 w-full sm:w-auto">
                    Começar grátis <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="h-12 px-8 text-base w-full sm:w-auto">
                    Já tenho conta
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Como Funciona */}
        <section id="como-funciona" className="py-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Como funciona o programa
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                É simples, rápido e totalmente gratuito. Veja como é fácil começar a ganhar.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Step 1 */}
              <div className="relative bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 h-12 w-12 rounded-full bg-purple-100 border-4 border-white flex items-center justify-center font-bold text-purple-600">
                  1
                </div>
                <div className="mt-6 h-16 w-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                  <Store className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Compre na loja</h3>
                <p className="text-gray-600">
                  Faça suas compras normalmente em qualquer de nossas lojas físicas ou online.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 h-12 w-12 rounded-full bg-purple-100 border-4 border-white flex items-center justify-center font-bold text-purple-600">
                  2
                </div>
                <div className="hidden md:block absolute top-1/2 -left-4 w-8 border-t-2 border-dashed border-gray-300"></div>
                <div className="mt-6 h-16 w-16 bg-pink-50 rounded-2xl flex items-center justify-center mb-6">
                  <Star className="h-8 w-8 text-pink-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Acumule pontos</h3>
                <p className="text-gray-600">
                  Informe o seu CPF no caixa. A cada R$ 1,00 em compras, você ganha 1 ponto.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 h-12 w-12 rounded-full bg-purple-100 border-4 border-white flex items-center justify-center font-bold text-purple-600">
                  3
                </div>
                <div className="hidden md:block absolute top-1/2 -left-4 w-8 border-t-2 border-dashed border-gray-300"></div>
                <div className="mt-6 h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
                  <Gift className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Resgate prêmios</h3>
                <p className="text-gray-600">
                  Acesse o painel, escolha sua recompensa e resgate usando seus pontos acumulados.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="beneficios" className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
                    Por que participar?
                  </h2>
                  <p className="text-lg text-gray-600">
                    Nosso programa foi desenhado para valorizar os clientes que estão sempre com a gente, de forma transparente e rápida.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Crédito instantâneo</h4>
                      <p className="mt-1 text-gray-600">Seus pontos caem na hora após a compra. Sem burocracia ou dias de espera.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Sem validade curta</h4>
                      <p className="mt-1 text-gray-600">Seus pontos duram 12 meses. Tempo de sobra para você juntar para aquele prêmio maior.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Segurança de dados</h4>
                      <p className="mt-1 text-gray-600">Adequado à LGPD. Seus dados estão seguros e você tem controle total sobre eles.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-100 to-pink-50 rounded-3xl transform rotate-3 scale-105 -z-10"></div>
                <div className="bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-100 p-4 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                  </div>
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Saldo atual</p>
                        <p className="text-4xl font-bold text-gray-900">1.450 <span className="text-lg text-gray-500 font-normal">pts</span></p>
                      </div>
                      <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xl">
                        A
                      </div>
                    </div>
                    
                    <h5 className="font-semibold text-gray-900 mb-4">Prêmios disponíveis para você:</h5>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-colors cursor-pointer">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Gift className="h-5 w-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Prêmio Exemplo {i}</p>
                              <p className="text-sm text-gray-500">{i * 500} pontos necessários</p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-purple-900 py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Pronto para começar a ganhar?
            </h2>
            <p className="text-purple-200 text-lg mb-8 max-w-2xl mx-auto">
              O cadastro leva menos de 2 minutos e você já pode começar a pontuar na sua próxima compra.
            </p>
            <Link to="/cadastro">
              <Button size="lg" className="bg-white text-purple-900 hover:bg-gray-100 h-14 px-8 text-lg font-semibold shadow-lg">
                Criar minha conta grátis
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="container mx-auto px-4 text-center text-gray-500">
          <div className="flex justify-center items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-purple-600" />
            <span className="font-bold text-lg text-gray-900">Fidelidade<span className="text-purple-600">Pro</span></span>
          </div>
          <p>© {new Date().getFullYear()} Sistema de Fidelidade. Todos os direitos reservados.</p>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <Link to="/regulamento" className="hover:text-purple-600 transition-colors">Regulamento</Link>
            <span className="text-gray-300">|</span>
            <a href="#" className="hover:text-purple-600 transition-colors">Política de Privacidade</a>
            <span className="text-gray-300">|</span>
            <a href="#" className="hover:text-purple-600 transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
