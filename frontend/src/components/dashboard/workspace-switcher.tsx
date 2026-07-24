"use client"

import { useAuth } from "@/lib/auth/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronsUpDown, Store, Check, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export function WorkspaceSwitcher() {
  const { tenants, activeTenantId, changeTenant, user } = useAuth()

  // Encontra o tenant ativo na lista
  const activeTenant = tenants.find((t) => t.tenantId === activeTenantId)

  if (tenants.length === 0) {
    return null
  }

  // Se o usuário só tiver um restaurante, renderiza um bloco estático (sem dropdown)
  if (tenants.length <= 1) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/40 bg-secondary/20 select-none">
        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
          <Store className="h-4.5 w-4.5" />
        </div>
        <div className="flex flex-col min-w-0 text-left">
          <span className="text-sm font-semibold text-foreground truncate">
            {activeTenant?.tenantName || user?.tenant_name || "Estabelecimento"}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {activeTenant?.role || user?.role || "Operador"}
          </span>
        </div>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/60 active:scale-[0.98] transition-all duration-200 outline-none focus:ring-1 focus:ring-primary/40 text-left">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
            <Store className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {activeTenant?.tenantName || "Selecionar..."}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {activeTenant?.role || "Operador"}
            </span>
          </div>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-60 min-w-60 mt-1 p-1 bg-popover border border-border shadow-md rounded-lg animate-in fade-in-50 slide-in-from-top-1">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
          Estabelecimentos
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/60 my-1" />
        
        {tenants.map((t) => {
          const isSelected = t.tenantId === activeTenantId
          return (
            <DropdownMenuItem
              key={t.tenantId}
              onClick={() => changeTenant(t.tenantId)}
              className={cn(
                "flex items-center justify-between px-2.5 py-2 rounded-md text-sm cursor-pointer transition-colors duration-150 outline-none select-none",
                isSelected 
                  ? "bg-primary/10 text-primary font-medium hover:bg-primary/15" 
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Store className="h-4 w-4 shrink-0" />
                <span className="truncate">{t.tenantName}</span>
              </div>
              {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
