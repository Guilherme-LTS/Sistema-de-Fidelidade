"use client"

import { Search, Mail, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MobileNav } from "./mobile-nav"
import type { ReactNode } from "react"
import { useAuth } from "@/lib/auth/auth-context"


interface HeaderProps {
  title: string
  description: string
  actions?: ReactNode
}

export function Header({ title, description, actions }: HeaderProps) {
  const { user } = useAuth()
  const initials = user?.nome
    ? user.nome
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "OP"

  return (
    <header className="space-y-3 md:space-y-4 animate-slide-in-up">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <MobileNav />

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search task"
              className="pl-9 pr-3 md:pr-16 h-9 text-sm bg-card border-border transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
            />
            <kbd className="hidden md:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-muted rounded border border-border">
              ⌘F
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-secondary transition-all duration-300 hover:scale-110 h-8 w-8"
          >
            <Mail className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-secondary transition-all duration-300 hover:scale-110 h-8 w-8"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
          </Button>

          <div className="flex items-center gap-2 pl-2 md:pl-3 border-l border-border">
            <Avatar className="w-7 h-7 md:w-8 md:h-8 ring-2 ring-primary/20 transition-all duration-300 hover:ring-primary/40 bg-muted">
              <AvatarImage src={user?.tenant_logo_url || ""} alt={user?.tenant_name || "Logo"} className="object-cover" />
              <AvatarFallback className="text-xs">
                {user?.tenant_name ? user.tenant_name.slice(0, 2).toUpperCase() : initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-xs hidden sm:block">
              <p className="font-semibold text-foreground">{user?.tenant_name || "Restaurante"}</p>
              <p className="text-muted-foreground text-[10px]">{user?.email || ""}</p>
            </div>
          </div>
        </div>
      </div>


      <div>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1">{title}</h1>
        <p className="text-xs md:text-sm text-muted-foreground">{description}</p>
      </div>

      {actions && <div className="flex flex-col sm:flex-row gap-2">{actions}</div>}
    </header>
  )
}
