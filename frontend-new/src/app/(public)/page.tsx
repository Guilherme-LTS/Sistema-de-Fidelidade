import Link from "next/link"
import { routes } from "@/config/routes"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-3xl space-y-6 text-center">
        <div className="space-y-3">
          <p className="text-sm font-medium text-primary">Sistema de Fidelidade</p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Base preparada para a nova experiencia do produto.
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Esta tela e um ponto de partida arquitetural. As funcionalidades serao migradas de forma incremental.
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <Button asChild>
            <Link href={routes.admin.dashboard}>Acessar painel</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={routes.auth.login}>Login</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
