import { AlterarSenhaForm } from "@/features/auth/components/alterar-senha-form"

export default function AlterarSenhaPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6 relative overflow-hidden">
      {/* Decorative gradient blur background */}
      <div className="absolute top-1/4 right-1/4 translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 -translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />
      
      {/* Botão Voltar */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 z-10">
        <a href="/" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          Voltar para o início
        </a>
      </div>

      <AlterarSenhaForm />
    </main>
  )
}
