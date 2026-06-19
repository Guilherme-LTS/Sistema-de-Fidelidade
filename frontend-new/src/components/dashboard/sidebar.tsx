"use client"

import { LayoutDashboard, Users, Gift, Settings, Trophy, Home, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { routes } from "@/config/routes"
import { useAuth } from "@/lib/auth/auth-context"


const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: routes.admin.dashboard },
  { icon: Users, label: "Clientes", href: routes.admin.clientes },
  { icon: Trophy, label: "Fidelidade", href: routes.admin.fidelidade },
]

const generalItems = [
  { icon: Gift, label: "Recompensas", href: routes.admin.recompensas },
  { icon: Settings, label: "Configuracoes", href: routes.admin.configuracoes },
  { icon: Home, label: "Pagina publica", href: routes.public.home },
]

export function Sidebar() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const pathname = usePathname()
  const { logout } = useAuth()


  return (
    <aside className="fixed top-0 left-0 w-64 bg-card border-r border-border p-4 h-screen overflow-y-auto lg:block">
      <div className="flex items-center gap-2 mb-6 group cursor-pointer">
        <Link href={routes.admin.dashboard} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center transition-transform group-hover:scale-110 duration-300 relative">
            <div
              className="w-1.5 h-1.5 rounded-full bg-primary-foreground absolute"
              style={{ top: "30%", left: "30%" }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full bg-primary-foreground absolute"
              style={{ top: "30%", right: "30%" }}
            />
            <div className="w-3 h-1.5 border-b-2 border-primary-foreground rounded-full absolute bottom-2.5" />
          </div>
          <span className="text-lg font-semibold text-foreground">Fidelidade</span>
        </Link>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Operacao</p>
          <nav className="space-y-0.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    hoveredItem === item.label && !isActive && "translate-x-1",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Sistema</p>
          <nav className="space-y-0.5">
            {generalItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    hoveredItem === item.label && !isActive && "translate-x-1",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 border-t border-border/40 pt-4">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-300 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Sair da conta</span>
        </button>
      </div>
    </aside>
  )
}
