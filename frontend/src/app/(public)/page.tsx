import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Check,
  Gift,
  LineChart,
  QrCode,
  Rocket,
  Sparkles,
  Store,
  Users,

} from "lucide-react"
import { Footer } from "@/components/layout/footer"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { DOMAINS } from "@/config/domains"

const appSignup = `${DOMAINS.app}/cadastro`
const appLogin = `${DOMAINS.app}/login`

const features = [
  { icon: Store, title: "Pontos por consumo", text: "Defina a regra que combina com o seu negócio: pontos por real gasto, por produto ou por visita." },
  { icon: Sparkles, title: "A sua marca em primeiro lugar", text: "Personalize o programa com sua identidade, suas regras e recompensas que fazem sentido para seus clientes." },
  { icon: BarChart3, title: "Visão do que acontece", text: "Acompanhe clientes ativos, resgates, frequência e resultados em um painel simples de entender." },
  { icon: Users, title: "Relacionamento que continua", text: "Conheça melhor quem compra de você e crie motivos para essa pessoa voltar mais vezes." },
]

const plans = [
  { name: "Essencial", price: "49", description: "Para começar a fidelizar", items: ["Até 150 clientes", "Programa de pontos", "Painel de gestão"], featured: false },
  { name: "Crescimento", price: "99", description: "Para negócios em movimento", items: ["Até 500 clientes", "Recompensas personalizadas", "Relatórios de desempenho", "Suporte prioritário"], featured: true },
  { name: "Pro", price: "199", description: "Para operações maiores", items: ["Clientes ilimitados", "Múltiplos operadores", "Dados e relatórios avançados", "Atendimento dedicado"], featured: false },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="#inicio" aria-label="Pontus - início" className="shrink-0">
            <Image src="/logo-light.png" alt="Pontus" width={148} height={40} priority className="h-8 w-auto" />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex" aria-label="Navegação principal">
            <Link href="#como-funciona" className="transition-colors hover:text-primary">Como funciona</Link>
            <Link href="#recursos" className="transition-colors hover:text-primary">Recursos</Link>
            <Link href="#planos" className="transition-colors hover:text-primary">Planos</Link>
            <Link href="#faq" className="transition-colors hover:text-primary">Dúvidas</Link>
          </nav>
          <div className="flex items-center gap-3">
            <a href={appLogin} className="hidden text-sm font-semibold text-muted-foreground transition-colors hover:text-primary sm:block">Entrar</a>
            <Button asChild className="rounded-full px-5 shadow-lg shadow-primary/15"><a href={appSignup}>Começar grátis <ArrowRight className="ml-2 h-4 w-4" /></a></Button>
          </div>
        </div>
      </header>

      <main>
        <section id="inicio" className="relative overflow-hidden bg-[#f4faf6] px-5 pb-20 pt-16 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-20">
            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-primary shadow-sm"><Sparkles className="h-3.5 w-3.5" /> Fidelidade sem complicação</div>
              <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight text-[#0d1f16] sm:text-5xl lg:text-6xl">Faça seu cliente voltar. <span className="text-primary">Mais vezes.</span></h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">O Pontus ajuda bares, sorveterias, lanchonetes e cafeterias a transformar consumo do dia a dia em relacionamento que dá resultado.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Button size="lg" asChild className="h-13 rounded-full px-7 text-base shadow-xl shadow-primary/20"><a href={appSignup}>Criar meu programa grátis <ArrowRight className="ml-2 h-5 w-5" /></a></Button><Button size="lg" variant="outline" asChild className="h-13 rounded-full border-primary/20 bg-white px-7 text-base text-primary"><a href="#como-funciona">Ver como funciona</a></Button></div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"><span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Setup rápido</span><span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Sem cartão de crédito</span></div>
            </div>
            <div className="relative mx-auto w-full max-w-[520px]">
              <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[1.5rem] border border-primary/10 bg-white p-3 shadow-2xl shadow-primary/15 sm:p-5">
                <div className="flex items-center justify-between border-b border-border/70 pb-4"><div><p className="text-xs font-medium text-muted-foreground">Visão geral</p><p className="font-heading text-lg font-bold">Olá, seu negócio</p></div><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><BarChart3 className="h-5 w-5" /></div></div>
                <div className="grid grid-cols-2 gap-3 py-4"><div className="rounded-xl bg-[#f4faf6] p-3"><p className="text-xs text-muted-foreground">Clientes ativos</p><p className="mt-1 text-2xl font-bold text-primary">248</p><p className="mt-1 text-xs text-emerald-600">+18,4% este mês</p></div><div className="rounded-xl bg-orange-50 p-3"><p className="text-xs text-muted-foreground">Resgates</p><p className="mt-1 text-2xl font-bold text-accent">86</p><p className="mt-1 text-xs text-orange-600">+12,7% este mês</p></div></div>
                <div className="rounded-xl border border-border/70 p-4"><div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold">Clientes recorrentes</p><span className="text-xs text-primary">Últimos 7 dias</span></div><div className="flex h-28 items-end gap-2">{[42,58,48,72,64,86,96].map((height, i) => <div key={i} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-md bg-primary/80 transition-all hover:bg-accent" style={{ height: `${height}%` }} /><span className="text-[10px] text-muted-foreground">{["S", "T", "Q", "Q", "S", "S", "D"][i]}</span></div>)}</div></div>
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-primary p-3 text-primary-foreground"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15"><Gift className="h-5 w-5" /></div><div><p className="text-xs text-white/70">Recompensa mais resgatada</p><p className="text-sm font-semibold">Chopp por conta da casa</p></div><ArrowRight className="ml-auto h-4 w-4" /></div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-white px-5 py-7 lg:px-8"><div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left"><div><p className="text-sm font-semibold text-primary">Já está acontecendo na prática</p><p className="mt-1 text-sm text-muted-foreground">O Pontus já está em produção, ajudando negócios reais a fortalecer o relacionamento com seus clientes.</p></div><div className="flex items-center gap-2 rounded-full bg-[#f4faf6] px-4 py-2 text-sm font-semibold text-primary"><div className="h-2 w-2 rounded-full bg-emerald-500" /> Plataforma ativa</div></div></section>

        <section id="como-funciona" className="px-5 py-24 lg:px-8"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.14em] text-accent">Do caixa ao retorno</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Fácil para sua equipe. <span className="text-primary">Atrativo para o cliente.</span></h2><p className="mt-4 text-lg leading-8 text-muted-foreground">Uma experiência simples para transformar cada compra em uma próxima visita.</p></div><div className="mt-14 grid gap-6 md:grid-cols-4">{[{n:"01", icon:QrCode, title:"Cliente consome", text:"A compra é registrada em poucos segundos, direto pelo caixa."},{n:"02", icon:LineChart, title:"Pontos acumulam", text:"O Pontus calcula tudo automaticamente, sem planilhas."},{n:"03", icon:Gift, title:"Recompensa aparece", text:"Seu cliente acompanha o saldo e descobre o que pode ganhar."},{n:"04", icon:Rocket, title:"Ele volta", text:"Um bom motivo para voltar vira hábito e aumenta a frequência."}].map(({n,icon:Icon,title,text})=><div key={n} className="group rounded-2xl border border-border/80 bg-white p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"><div className="flex items-center justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-6 w-6" /></div><span className="font-heading text-sm font-bold text-primary/40">{n}</span></div><h3 className="mt-7 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>)}</div></div></section>

        <section id="recursos" className="bg-[#0d1f16] px-5 py-24 text-white lg:px-8"><div className="mx-auto max-w-7xl"><div className="grid gap-14 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="text-sm font-bold uppercase tracking-[.14em] text-orange-300">Tudo no seu controle</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Uma plataforma que acompanha o ritmo do seu negócio.</h2><p className="mt-5 leading-7 text-white/65">Você não precisa de uma equipe de tecnologia para começar. O Pontus foi feito para funcionar na rotina real de quem atende, vende e cuida do próprio negócio.</p><Button asChild className="mt-8 rounded-full bg-accent px-6 text-white hover:bg-accent/90"><a href={appSignup}>Conhecer o Pontus <ArrowRight className="ml-2 h-4 w-4" /></a></Button></div><div className="grid gap-4 sm:grid-cols-2">{features.map(({icon:Icon,title,text})=><div key={title} className="rounded-2xl border border-white/10 bg-white/[.06] p-6 transition-colors hover:bg-white/10"><Icon className="h-6 w-6 text-orange-300" /><h3 className="mt-5 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-white/60">{text}</p></div>)}</div></div></div></section>

        <section id="planos" className="bg-[#f4faf6] px-5 py-24 lg:px-8"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Planos simples</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Comece pequeno. Cresça com clareza.</h2><p className="mt-4 text-muted-foreground">Escolha o plano que combina com o momento do seu negócio. Você pode mudar quando quiser.</p></div><div className="mt-12 grid gap-5 lg:grid-cols-3">{plans.map(plan=><div key={plan.name} className={`relative rounded-2xl border bg-white p-7 ${plan.featured ? "border-primary shadow-2xl shadow-primary/15 lg:-translate-y-3" : "border-border/80"}`}>{plan.featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">Mais escolhido</div>}<h3 className="text-xl font-bold">{plan.name}</h3><p className="mt-2 text-sm text-muted-foreground">{plan.description}</p><div className="mt-7 flex items-end gap-1"><span className="text-sm text-muted-foreground">R$</span><span className="text-4xl font-bold">{plan.price}</span><span className="mb-1 text-sm text-muted-foreground">/mês</span></div><Button asChild variant={plan.featured ? "default" : "outline"} className="mt-7 w-full rounded-full"><a href={appSignup}>Começar agora</a></Button><ul className="mt-7 space-y-3 border-t border-border/70 pt-6">{plan.items.map(item=><li key={item} className="flex gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 shrink-0 text-primary" />{item}</li>)}</ul></div>)}</div></div></section>

        <section className="px-5 py-24 lg:px-8"><div className="mx-auto grid max-w-5xl gap-10 rounded-3xl bg-primary px-7 py-10 text-white sm:px-12 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-sm font-bold uppercase tracking-[.14em] text-emerald-200">Quem usa, recomenda</p><blockquote className="mt-4 max-w-2xl font-heading text-2xl font-semibold leading-snug sm:text-3xl">“O Pontus foi pensado para a rotina de quem tem um negócio de verdade. Este espaço está reservado para contar a história do nosso primeiro cliente.”</blockquote><p className="mt-5 text-sm text-white/70">Depoimento de cliente em produção — em breve</p></div><div className="hidden h-24 w-24 items-center justify-center rounded-2xl bg-white/10 lg:flex"><Store className="h-10 w-10 text-emerald-200" /></div></div></section>

        <section id="faq" className="px-5 pb-24 lg:px-8"><div className="mx-auto max-w-3xl"><div className="text-center"><p className="text-sm font-bold uppercase tracking-[.14em] text-accent">Dúvidas comuns</p><h2 className="mt-3 text-3xl font-bold tracking-tight">Antes de começar</h2></div><Accordion type="single" collapsible className="mt-10">{[{q:"Preciso instalar algum equipamento?",a:"Não. O Pontus funciona na nuvem e pode ser acessado pelo computador, tablet ou celular que você já usa no negócio."},{q:"Quanto tempo leva para configurar?",a:"Você pode criar as regras do seu programa em poucos minutos. A plataforma foi feita para começar sem projeto técnico ou treinamento longo."},{q:"Meu cliente precisa baixar um aplicativo?",a:"Não. Ele acompanha os pontos e recompensas pelo navegador do celular, sem ocupar espaço e sem instalar nada."},{q:"Posso escolher a recompensa?",a:"Sim. Você define a regra de acúmulo e cria recompensas que façam sentido para sua operação, como um chopp, uma casquinha ou um desconto."},{q:"O Pontus serve só para bares e sorveterias?",a:"Não. Esses são os negócios para os quais desenhamos a experiência inicial, mas a plataforma é flexível para outros estabelecimentos de consumo recorrente."}].map((item,i)=><AccordionItem key={item.q} value={`item-${i}`}><AccordionTrigger className="text-left text-base font-semibold">{item.q}</AccordionTrigger><AccordionContent className="leading-7 text-muted-foreground">{item.a}</AccordionContent></AccordionItem>)}</Accordion></div></section>

        <section className="bg-accent px-5 py-16 text-center text-white lg:px-8"><div className="mx-auto max-w-3xl"><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Seu próximo cliente fiel pode começar hoje.</h2><p className="mx-auto mt-4 max-w-xl text-white/80">Crie seu programa de fidelidade e comece a transformar consumo em relacionamento.</p><Button size="lg" asChild className="mt-8 rounded-full bg-white px-8 text-accent shadow-xl hover:bg-white/90"><a href={appSignup}>Começar grátis <ArrowRight className="ml-2 h-5 w-5" /></a></Button></div></section>
      </main>
      <Footer />
    </div>
  )
}

