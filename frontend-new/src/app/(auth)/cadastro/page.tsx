import Link from "next/link"
import { routes } from "@/config/routes"
import { Button } from "@/components/ui/button"

export default function CadastroPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Cadastro</h1>
          <p className="text-sm text-muted-foreground">Cadastro de restaurante sera migrado apos a base de auth.</p>
        </div>

        <Button variant="outline" asChild className="w-full">
          <Link href={routes.auth.login}>Ir para login</Link>
        </Button>
      </section>
    </main>
  )
}
