import { Star } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TopCustomer } from "@/lib/api/types"

interface Props {
  customers: TopCustomer[]
}

export function TopCustomers({ customers }: Props) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top Clientes</CardTitle>
        <CardDescription>Clientes que mais acumularam pontos</CardDescription>
      </CardHeader>
      <CardContent>
        {customers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum dado disponível ainda.</p>
        ) : (
          <div className="space-y-6">
            {customers.map((c, index) => (
              <div key={c.id} className="flex items-center justify-between min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${index === 0 ? "bg-amber-500/20 text-amber-600" : 
                      index === 1 ? "bg-slate-300/40 text-slate-600" : 
                      index === 2 ? "bg-amber-700/20 text-amber-800" : "bg-muted text-muted-foreground"}`}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-none truncate">{c.nome}</p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1 font-semibold text-primary ml-4">
                  {c.saldo} <Star className="w-3 h-3 fill-primary" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
