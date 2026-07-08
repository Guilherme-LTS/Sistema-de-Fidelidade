"use client"

import { LayoutDashboard, Users, Gift, Settings, Trophy, LogOut, ShieldCheck, UsersRound, UserCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { routes } from "@/config/routes"
import { useAuth } from "@/lib/auth/auth-context"
import { WorkspaceSwitcher } from "./workspace-switcher"

const sidebarGroups = [
  {
    title: "Visão Geral",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: routes.admin.dashboard, roles: ["admin", "operador"] },
    ]
  },
  {
    title: "Operação",
    items: [
      { icon: Users, label: "Clientes", href: routes.admin.clientes, roles: ["admin", "operador", "novato"] },
      { icon: Trophy, label: "Fidelidade", href: routes.admin.fidelidade, roles: ["admin", "operador", "novato"] },
      { icon: Gift, label: "Recompensas", href: routes.admin.recompensas, roles: ["admin", "operador", "novato"] },
    ]
  },
  {
    title: "Administração",
    items: [
      { icon: UsersRound, label: "Equipe", href: routes.admin.equipe, roles: ["admin"] },
      { icon: ShieldCheck, label: "Auditoria", href: routes.admin.auditoria, roles: ["admin"] },
    ]
  },
  {
    title: "Configurações",
    items: [
      { icon: Settings, label: "Configurações", href: routes.admin.configuracoes, roles: ["admin"] },
    ]
  },
  {
    title: "Conta",
    items: [
      { icon: UserCircle, label: "Meu Perfil", href: routes.admin.perfil, roles: ["admin", "operador", "novato"] },
    ]
  }
]

export function Sidebar() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="fixed top-0 left-0 w-64 bg-card border-r border-border/60 p-4 h-screen flex flex-col justify-between lg:block">
      <div className="space-y-6">
        <div className="flex items-center gap-2 px-2 group cursor-pointer">
          <Link href={routes.admin.dashboard} className="flex items-center gap-2.5">
            <div className="flex items-center gap-2">
              <Image src="/logo-light.png" alt="Pontus Logo" width={200} height={23} className="dark:hidden" priority  style={{ width: "auto", height: "auto" }} />
              <Image src="/logo-dark.png" alt="Pontus Logo" width={200} height={23} className="hidden dark:block" priority  style={{ width: "auto", height: "auto" }} />
            </div>
          </Link>
        </div>

        <WorkspaceSwitcher />

        <div className="space-y-4">
          {sidebarGroups.map((group) => {
            // Check if user has permission to see at least one item in the group
            const visibleItems = group.items.filter(item => !user || item.roles.includes(user.role))
            if (visibleItems.length === 0) return null

            return (
              <div key={group.title} className="space-y-1">
                <p className="px-2.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">
                  {group.title}
                </p>
                <nav className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onMouseEnter={() => setHoveredItem(item.label)}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10"
                            : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                          hoveredItem === item.label && !isActive && "translate-x-0.5"
                        )}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </nav>
              </div>
            )
          })}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 border-t border-border/40 pt-4 bg-card">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200 cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
  )
}
