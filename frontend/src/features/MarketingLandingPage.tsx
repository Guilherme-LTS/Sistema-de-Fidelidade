import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Gift,
  HeartHandshake,
  LineChart,
  Lock,
  MessageSquareQuote,
  ShieldCheck,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "../components/ui/button";

function LandingPage() {
  const publicTenantSlug = process.env.REACT_APP_PUBLIC_TENANT_SLUG;
  const portalPath = publicTenantSlug ? `/p/${publicTenantSlug}` : "/meus-pontos";

  const benefits = [
    {
      icon: TrendingUp,
      title: "Receita mais previsível",
      description: "Estimule recorrência com uma mecânica simples que ajuda a converter visitas pontuais em hábito.",
    },
    {
      icon: Wallet,
      title: "Operação automatizada",
      description: "Cada compra entra no saldo de forma clara, reduzindo trabalho manual e atrito no caixa.",
    },
    {
      icon: Users,
      title: "Mais retenção, menos esforço",
      description: "Mantenha seu público por perto com recompensas que incentivam frequência e elevam o ticket médio.",
    },
    {
      icon: Lock,
      title: "Controle e credibilidade",
      description: "Dados organizados, histórico visível e experiência confiável para o restaurante e para o cliente final.",
    },
  ];

  const steps = [
    {
      icon: Store,
      title: "Cadastre o restaurante",
      description: "Crie o programa com poucos cliques e personalize o ambiente da sua marca.",
    },
    {
      icon: BarChart3,
      title: "O cliente acumula pontos",
      description: "A cada compra, o saldo é atualizado e o cliente acompanha tudo em tempo real.",
    },
    {
      icon: Gift,
      title: "Recompensas são resgatadas",
      description: "Defina prêmios e permita resgates com um fluxo simples, rápido e intuitivo.",
    },
  ];

  const stats = [
    { value: "120+", label: "restaurantes cadastrados" },
    { value: "R$ 3,2M", label: "em consumo recompensado" },
    { value: "18 min", label: "para colocar o programa no ar" },
    { value: "4,8/5", label: "de satisfação média dos parceiros" },
  ];

  const testimonials = [
    {
      quote: "A operação ficou mais clara e o programa passou a ser percebido como um diferencial real do restaurante.",
      author: "Marina Costa",
      role: "Gestora, Casa Verde Bistrô",
    },
    {
      quote: "Em poucas semanas já notamos mais retornos no almoço executivo e menos dúvidas no atendimento.",
      author: "Rafael Lima",
      role: "Sócio, Sabor da Praça",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm">
              <HeartHandshake className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="leading-tight">
              <span className="block text-lg font-extrabold tracking-tight text-slate-900">Fidelidade</span>
              <span className="block text-sm font-semibold text-emerald-600">B2B para restaurantes</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#beneficios" className="transition-colors hover:text-emerald-700">Benefícios</a>
            <a href="#como-funciona" className="transition-colors hover:text-emerald-700">Como funciona</a>
            <a href="#credibilidade" className="transition-colors hover:text-emerald-700">Credibilidade</a>
            <a href="#cta-final" className="transition-colors hover:text-emerald-700">Começar</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login">
              <Button variant="ghost" className="hidden sm:inline-flex text-slate-700 hover:text-emerald-700">
                Entrar
              </Button>
            </Link>
            <Link to={portalPath}>
              <Button variant="outline" className="hidden sm:inline-flex border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50">
                Consultar pontos
              </Button>
            </Link>
            <Link to="/cadastro">
              <Button className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700">
                Solicitar demonstração
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-white">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_38%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.10),transparent_28%)]" />
          <div className="mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                Plataforma B2B para fidelização de clientes em restaurantes
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Fidelize mais clientes no seu restaurante com uma experiência simples, elegante e pronta para vender mais.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
                Um sistema de fidelidade B2B que automatiza pontos, organiza resgates e entrega uma jornada clara para o caixa, para a gestão e para o cliente final.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to="/cadastro">
                  <Button size="lg" className="h-12 w-full bg-emerald-600 px-8 text-base font-semibold text-white shadow-md hover:bg-emerald-700 sm:w-auto">
                    Agendar demonstração
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to={portalPath}>
                  <Button size="lg" variant="outline" className="h-12 w-full border-emerald-200 px-8 text-base font-semibold text-emerald-700 hover:bg-emerald-50 sm:w-auto">
                    Acessar portal do cliente
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  UI limpa, profissional e responsiva
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Estrutura alinhada à LGPD
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-emerald-600" />
                  Setup rápido para operação real
                </div>
              </div>
            </div>

            <div className="relative lg:pl-8">
              <div className="absolute -left-6 top-8 hidden h-24 w-24 rounded-full bg-emerald-200/50 blur-3xl lg:block" />
              <div className="rounded-[28px] border border-emerald-100 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-emerald-200" />
                      <span className="h-3 w-3 rounded-full bg-emerald-300" />
                      <span className="h-3 w-3 rounded-full bg-emerald-400" />
                    </div>
                    <div className="ml-3 h-2 w-40 rounded-full bg-slate-100" />
                  </div>

                  <div className="grid gap-4 p-5 sm:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                      <p className="text-sm font-medium text-slate-500">Painel operacional</p>
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <p className="text-3xl font-black tracking-tight text-slate-900">1.450 pts</p>
                          <p className="mt-1 text-sm text-slate-500">Saldo médio por cliente ativo</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                          <LineChart className="h-6 w-6" />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3">
                        {[
                          ["Clientes recorrentes", "78%"],
                          ["Pontos resgatados", "32.4k"],
                          ["Campanhas ativas", "6"],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                            <span className="text-sm text-slate-600">{label}</span>
                            <span className="text-sm font-semibold text-slate-900">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-emerald-600 p-5 text-white shadow-sm">
                      <p className="text-sm font-medium text-emerald-50">Experiência do cliente</p>
                      <div className="mt-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
                        <p className="text-sm text-emerald-50">Consulta de pontos</p>
                        <p className="mt-2 text-4xl font-black">1.450</p>
                        <p className="mt-1 text-sm text-emerald-50/90">pontos disponíveis</p>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Gift className="h-4 w-4" />
                            Resgate disponível
                          </div>
                          <p className="mt-1 text-sm text-emerald-50/90">Café da casa, sobremesa ou desconto no próximo pedido.</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Users className="h-4 w-4" />
                            Fidelização recorrente
                          </div>
                          <p className="mt-1 text-sm text-emerald-50/90">Cliente entende o valor e volta com mais frequência.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="beneficios" className="border-y border-slate-200 bg-slate-50/80">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Benefícios</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Tudo que um restaurante precisa para reter mais sem complicar a operação.
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Uma experiência clara, moderna e confiável para a equipe no caixa e para o cliente que volta.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <article key={benefit.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-slate-900">{benefit.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{benefit.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Como funciona</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  Três passos simples para ativar seu programa de fidelidade.
                </h2>
                <p className="mt-4 text-lg leading-8 text-slate-600">
                  O fluxo é direto: o restaurante entra no sistema, o cliente acumula saldo automaticamente e os resgates acontecem sem atrito.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <article key={step.title} className="relative rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                        <span className="text-lg font-black">0{index + 1}</span>
                      </div>
                      <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 ring-1 ring-emerald-100">
                        <Icon className="h-7 w-7" />
                      </div>
                      <h3 className="mt-5 text-xl font-bold text-slate-900">{step.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                      {index < steps.length - 1 && (
                        <div className="absolute right-[-14px] top-1/2 hidden h-px w-7 border-t border-dashed border-emerald-300 md:block" />
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="credibilidade" className="border-y border-slate-200 bg-slate-50/70">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Prova social</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  Credibilidade visível para acelerar a decisão.
                </h2>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                  Números de exemplo e depoimentos placeholder ajudam a transmitir confiança enquanto os primeiros clientes entram na operação.
                </p>

                <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <p className="text-3xl font-black tracking-tight text-emerald-700">{stat.value}</p>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                {testimonials.map((testimonial) => (
                  <blockquote key={testimonial.author} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <MessageSquareQuote className="h-6 w-6 text-emerald-600" />
                    <p className="mt-4 text-base leading-8 text-slate-700">“{testimonial.quote}”</p>
                    <footer className="mt-5 border-t border-slate-100 pt-4">
                      <p className="font-semibold text-slate-900">{testimonial.author}</p>
                      <p className="text-sm text-slate-500">{testimonial.role}</p>
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="cta-final" className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="rounded-[32px] border border-emerald-100 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_55%,#ecfdf5_100%)] p-8 shadow-sm sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Pronto para começar</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  Leve mais retorno para o seu restaurante com uma plataforma que inspira confiança.
                </h2>
                <p className="mt-4 text-lg leading-8 text-slate-600">
                  Configure o programa, acompanhe resultados e entregue uma experiência melhor para o cliente final.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0">
                <Link to="/cadastro">
                  <Button size="lg" className="h-12 w-full bg-emerald-600 px-8 text-base font-semibold text-white hover:bg-emerald-700 sm:w-auto">
                    Solicitar demonstração
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="h-12 w-full border-emerald-200 px-8 text-base font-semibold text-emerald-700 hover:bg-emerald-50 sm:w-auto">
                    Entrar no painel
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-white shadow-sm">
                <HeartHandshake className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-base font-extrabold tracking-tight text-slate-900">Fidelidade</p>
                <p className="text-sm font-medium text-emerald-700">Solução B2B para restaurantes</p>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
              Plataforma de fidelidade visualmente clara, responsiva e focada em conversão para restaurantes que querem aumentar recorrência.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Links</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li><a href="#beneficios" className="transition-colors hover:text-emerald-700">Sobre</a></li>
              <li><a href="#cta-final" className="transition-colors hover:text-emerald-700">Contato</a></li>
              <li><Link to="/regulamento" className="transition-colors hover:text-emerald-700">Termos</Link></li>
              <li><Link to="/regulamento" className="transition-colors hover:text-emerald-700">Privacidade</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Redes sociais</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li><a href="https://instagram.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-emerald-700">Instagram</a></li>
              <li><a href="https://linkedin.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-emerald-700">LinkedIn</a></li>
              <li><a href="mailto:contato@fidelidadepro.com" className="transition-colors hover:text-emerald-700">contato@fidelidadepro.com</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
