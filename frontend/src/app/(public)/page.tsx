import Link from "next/link"
import Image from "next/image"
import { ArrowRight, CheckCircle2, QrCode, Smartphone, Store, Gift, ChevronDown, User, Star, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { routes } from "@/config/routes"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      
      {/* 1. Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo-light.png" alt="Pontus" width={180} height={48} className="dark:hidden" priority  style={{ width: "auto", height: "auto" }} />
            <Image src="/logo-dark.png" alt="Pontus" width={180} height={48} className="hidden dark:block" priority  style={{ width: "auto", height: "auto" }} />
          </div>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="#como-funciona" className="hover:text-foreground transition-colors">Como Funciona</Link>
            <Link href="#beneficios" className="hover:text-foreground transition-colors">Benefícios</Link>
            <Link href="#faq" className="hover:text-foreground transition-colors">FAQ</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" className="hidden sm:inline-flex font-medium" asChild>
              <Link href="/login">Entrar (Lojista)</Link>
            </Button>
            <Button className="rounded-full shadow-md font-medium" asChild>
              <Link href="/painel">
                <User className="mr-2 h-4 w-4" /> Meus Pontos
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        
        {/* 2. Hero Section (Foco B2B) */}
        <section className="relative overflow-hidden bg-background pt-24 pb-32">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom dark:border-b dark:border-slate-100/5" style={{ maskImage: "linear-gradient(to bottom, transparent, black)" }}></div>
          <div className="absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl xl:-top-6">
            <div className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-primary to-accent opacity-20" style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}></div>
          </div>

          <div className="container mx-auto max-w-6xl px-4 text-center relative z-10">
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary mb-6">
              O fim do cartãozinho de papel
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
              Fidelize clientes e aumente o faturamento de forma <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">automática</span>.
            </h1>
            
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Crie seu programa de recompensas em minutos. Sem fricção no caixa, sem complicação. Seus clientes voltam mais vezes e você vende mais.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 text-base shadow-xl rounded-full" asChild>
                <Link href="/cadastro">Criar Conta Grátis <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base rounded-full" asChild>
                <Link href="#como-funciona">Como Funciona</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 3. B2C Quick Access Bar */}
        <section className="bg-primary/5 border-y py-8 relative z-20 shadow-inner">
          <div className="container mx-auto max-w-4xl px-4 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="bg-primary/20 p-3 rounded-full">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">É cliente de um parceiro?</h3>
                <p className="text-sm text-muted-foreground">Consulte seus pontos e resgate prêmios.</p>
              </div>
            </div>
            
            <div className="w-full md:w-auto flex-1 max-w-md flex gap-2">
              <Button className="w-full h-12 text-base rounded-xl shadow-md bg-foreground text-background hover:bg-foreground/90" asChild>
                <Link href="/painel">
                  Acessar Meu Painel de Pontos
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 4. Como Funciona */}
        <section id="como-funciona" className="py-24 bg-background">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight">Como funciona na prática?</h2>
              <p className="text-muted-foreground mt-4 text-lg">Simples para o caixa, incrível para o cliente.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Conector Visual */}
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-border -z-10"></div>
              
              <div className="bg-card p-6 rounded-2xl shadow-sm border text-center relative z-10 hover:shadow-md transition-all">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg">1</div>
                <h3 className="text-xl font-semibold mb-3">O Cliente Compra</h3>
                <p className="text-muted-foreground">No momento do pagamento, o operador do caixa digita apenas o CPF do cliente. Rápido e sem filas.</p>
              </div>

              <div className="bg-card p-6 rounded-2xl shadow-sm border text-center relative z-10 hover:shadow-md transition-all">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg">2</div>
                <h3 className="text-xl font-semibold mb-3">Os Pontos Acumulam</h3>
                <p className="text-muted-foreground">O sistema calcula os pontos automaticamente. O cliente acessa o painel pelo celular e vê o saldo na hora.</p>
              </div>

              <div className="bg-card p-6 rounded-2xl shadow-sm border text-center relative z-10 hover:shadow-md transition-all">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg">3</div>
                <h3 className="text-xl font-semibold mb-3">O Resgate Acontece</h3>
                <p className="text-muted-foreground">Motivado pelas recompensas, o cliente volta mais vezes ao seu estabelecimento para resgatar os prêmios.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Benefícios (Split) */}
        <section id="beneficios" className="py-24 bg-muted/30 border-y">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight">O sistema perfeito para ambos os lados</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              {/* Lado do Lojista */}
              <div className="bg-card p-8 rounded-3xl shadow-xl border">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <Store className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">Para o Estabelecimento</h3>
                </div>
                
                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                    <div>
                      <strong className="block text-foreground text-lg">Aumento de Retenção</strong>
                      <span className="text-muted-foreground text-sm">Clientes em programas de fidelidade gastam em média 30% a mais por ano.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                    <div>
                      <strong className="block text-foreground text-lg">Fim das Fraudes</strong>
                      <span className="text-muted-foreground text-sm">Adeus carimbos falsificados. Tudo é auditado, seguro e rastreável pelo sistema.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                    <div>
                      <strong className="block text-foreground text-lg">Dados Valiosos</strong>
                      <span className="text-muted-foreground text-sm">Descubra quem são seus melhores clientes, a frequência de visita e o ticket médio real.</span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Lado do Consumidor */}
              <div className="bg-card p-8 rounded-3xl shadow-xl border">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-accent/10 rounded-2xl">
                    <Smartphone className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold">Para o Consumidor</h3>
                </div>
                
                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                    <div>
                      <strong className="block text-foreground text-lg">Sem Apps para Instalar</strong>
                      <span className="text-muted-foreground text-sm">O cliente não precisa baixar nada. Ele acessa tudo diretamente pelo navegador web.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                    <div>
                      <strong className="block text-foreground text-lg">Saldo na Palma da Mão</strong>
                      <span className="text-muted-foreground text-sm">Transparência total. Ele sabe exatamente quantos pontos tem e quando vão expirar.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                    <div>
                      <strong className="block text-foreground text-lg">Privacidade Garantida</strong>
                      <span className="text-muted-foreground text-sm">O painel é protegido por senha pessoal. Ninguém além do cliente tem acesso ao extrato.</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 6. FAQ */}
        <section id="faq" className="py-24 bg-background">
          <div className="container mx-auto max-w-3xl px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">Perguntas Frequentes</h2>
              <p className="text-muted-foreground mt-4">Tudo o que você precisa saber sobre a plataforma.</p>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left font-medium">Preciso comprar algum equipamento especial?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Não! O sistema funciona 100% na nuvem. Qualquer computador, tablet ou celular com acesso à internet que já exista no seu caixa pode ser utilizado pelos seus operadores.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left font-medium">Qualquer funcionário pode lançar pontos?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Você tem controle total sobre isso. Você pode criar perfis separados (Admins, Operadores e Novatos). Todas as transações e resgates ficam registrados em um log de auditoria imutável, dizendo quem fez o que, e a que horas.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left font-medium">O cliente final paga alguma coisa?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Absolutamente nada. O programa de recompensas é um benefício que você oferece aos seus clientes para mantê-los fidelizados. A plataforma é gratuita para os consumidores finais.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left font-medium">Posso personalizar as recompensas?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Sim! Você cria quantas recompensas quiser e define quantos pontos cada uma custa. Pode ser desde "1 Sobremesa Grátis" até "Jantar Completo". Tudo é feito pelo seu painel administrativo.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <footer className="bg-card border-t py-12">
        <div className="container mx-auto max-w-6xl px-4 flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
          
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
            <div className="flex items-center gap-2">
              <Image src="/logo-light.png" alt="Pontus" width={220} height={59} className="dark:hidden" priority  style={{ width: "auto", height: "auto" }} />
            <Image src="/logo-dark.png" alt="Pontus" width={220} height={59} className="hidden dark:block" priority  style={{ width: "auto", height: "auto" }} />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              A plataforma definitiva de retenção e fidelização para estabelecimentos e negócios locais.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 text-sm">
            <div className="flex flex-col space-y-3">
              <h4 className="font-semibold text-foreground">Produto (B2B)</h4>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">Entrar no Painel</Link>
              <Link href="/cadastro" className="text-muted-foreground hover:text-foreground">Criar Conta</Link>
            </div>
            <div className="flex flex-col space-y-3">
              <h4 className="font-semibold text-foreground">Consumidores (B2C)</h4>
              <Link href="/painel" className="text-muted-foreground hover:text-foreground">Meus Pontos</Link>
              <a href="#" className="text-muted-foreground hover:text-foreground">Termos de Uso</a>
              <a href="#" className="text-muted-foreground hover:text-foreground">Privacidade (LGPD)</a>
            </div>
          </div>

        </div>
        <div className="container mx-auto max-w-6xl px-4 mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Pontus. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
