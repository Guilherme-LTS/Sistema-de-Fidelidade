import Image from "next/image"
import { DOMAINS } from "@/config/domains"

interface FooterProps {
  className?: string
}

export function Footer({ className = "" }: FooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={`w-full bg-background border-t border-border mt-auto shrink-0 ${className}`}>
      <div className="container mx-auto px-4 py-8 md:py-10">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
          
          {/* Logo e Descrição */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <Image 
                src="/logo-light.png" 
                alt="Pontus" 
                width={140} 
                height={38} 
                className="dark:hidden" 
                priority 
                style={{ width: "auto", height: "auto", maxHeight: "32px" }} 
              />
              <Image 
                src="/logo-dark.png" 
                alt="Pontus" 
                width={140} 
                height={38} 
                className="hidden dark:block" 
                priority 
                style={{ width: "auto", height: "auto", maxHeight: "32px" }} 
              />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A plataforma definitiva de retenção e fidelização para estabelecimentos e negócios locais.
            </p>
          </div>

          {/* Links e Navegação */}
          <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 text-center sm:text-left">
            <div className="flex flex-col space-y-2.5">
              <h4 className="font-semibold text-foreground text-sm uppercase tracking-wider">
                Para Estabelecimentos
              </h4>
              <ul className="space-y-2 mt-1">
                <li>
                  <a href={`${DOMAINS.app}/login`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Entrar no Painel
                  </a>
                </li>
                <li>
                  <a href={`${DOMAINS.app}/cadastro`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Criar Conta
                  </a>
                </li>
              </ul>
            </div>
            
            <div className="flex flex-col space-y-2.5">
              <h4 className="font-semibold text-foreground text-sm uppercase tracking-wider">
                Para Consumidores
              </h4>
              <ul className="space-y-2 mt-1">
                <li>
                  <a href={`${DOMAINS.app}/painel`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Meus Pontos
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-6 border-t border-border/60 flex flex-col md:flex-row justify-center md:justify-between items-center gap-4 text-center md:text-left text-xs text-muted-foreground">
          <p>© {currentYear} Pontus. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
