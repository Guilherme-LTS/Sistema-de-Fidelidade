import { notFound } from "next/navigation"
import { Metadata } from "next"
import { ConsumerAuthForm } from "@/features/consumer/components/consumer-auth-form"

// No futuro, isso será substituído por uma chamada à API do backend
async function getTenantBySlug(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/public/tenants/${slug}`, {
      next: { revalidate: 60 } // Cache por 60 segundos
    })
    
    if (!res.ok) {
      if (res.status === 404) return null
      throw new Error('Falha ao buscar estabelecimento')
    }
    
    return res.json()
  } catch (err) {
    console.error("Erro ao carregar tenant:", err)
    return null
  }
}

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params
  const data = await getTenantBySlug(params.slug)
  const tenant = data?.data
  
  if (!tenant) {
    return { title: "Restaurante não encontrado" }
  }

  return {
    title: `Fidelidade | ${tenant.name}`,
    description: `Acesse seus pontos e prêmios em ${tenant.name}`,
  }
}

export default async function FidelidadePage(props: PageProps) {
  const params = await props.params
  const data = await getTenantBySlug(params.slug)
  const tenant = data?.data

  if (!tenant) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          {tenant.logoUrl ? (
            <img 
              src={tenant.logoUrl} 
              alt={tenant.name} 
              className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-primary/20 shadow-xl"
            />
          ) : (
            <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 shadow-xl text-3xl font-bold text-primary">
              {tenant.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          
          <div>
            <h1 className="text-2xl font-bold text-foreground">{tenant.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">Programa de Recompensas</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-xl border border-border">
          <ConsumerAuthForm tenantName={tenant.name} />
        </div>
      </div>
    </div>
  )
}
