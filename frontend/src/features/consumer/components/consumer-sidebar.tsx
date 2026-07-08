"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Store, User, LogOut, Star } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useConsumerAuth } from "../contexts/consumer-auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface ConsumerSidebarProps {
  onItemClick?: () => void
}

export function ConsumerSidebar({ onItemClick }: ConsumerSidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { data, logout } = useConsumerAuth()

  const profile = data?.profile

  const menuItems = [
    {
      icon: Store,
      label: "Meus Restaurantes",
      href: "/painel",
    },
    {
      icon: User,
      label: "Meu Perfil",
      href: "/perfil",
    },
  ]

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "CL"

  const handleLogout = async () => {
    if (onItemClick) onItemClick()
    await logout()
  }

  return (
    <div className="flex flex-col h-full bg-card border-r border-border p-4">
      {/* Header / Logo */}
      <div className="flex flex-col gap-1 mb-8 group cursor-pointer px-1">
        <Link href="/painel" className="flex flex-col" onClick={onItemClick}>
          <Image src="/logo-light.png" alt="Pontus Logo" width={140} height={37} className="dark:hidden transition-transform group-hover:scale-105 duration-300" priority  style={{ width: "auto", height: "auto" }} />
          <Image src="/logo-dark.png" alt="Pontus Logo" width={140} height={37} className="hidden dark:block transition-transform group-hover:scale-105 duration-300" priority  style={{ width: "auto", height: "auto" }} />
          <span className="text-xs font-medium text-muted-foreground mt-1.5 ml-1 uppercase tracking-wider">Portal do Cliente</span>
        </Link>
      </div>

      {/* Profile summary */}
      {profile && (
        <div className="flex items-center gap-3 p-3 mb-6 bg-muted/40 rounded-xl border border-border/50">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{profile.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {profile.document.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")}
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 space-y-4">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider px-2.5">
            Navegação
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onItemClick}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    hoveredItem === item.label && !isActive && "translate-x-1"
                  )}
                >
                  <item.icon className="w-4.5 h-4.5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Footer / Logout */}
      <div className="border-t border-border/60 pt-4 mt-auto">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-300 cursor-pointer"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>Sair da conta</span>
        </button>
      </div>
    </div>
  )
}
