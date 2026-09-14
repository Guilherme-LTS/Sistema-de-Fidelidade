"use client"

import { LogOut, User, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/lib/auth/auth-context"
import { MobileNav } from "./mobile-nav"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { routes } from "@/config/routes"

export function AdminHeader() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  const initials = user?.nome
    ? user.nome
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "OP"

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="sticky top-0 z-40 w-full flex h-14 md:h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-3 lg:hidden">
        <MobileNav />
        {/* Mostramos o Logo apenas no mobile já que a Sidebar desktop já o possui */}
        <div className="flex items-center">
          <Image 
            src="/logo-dark.png" 
            alt="Pontus" 
            width={90} 
            height={24} 
            className="hidden dark:block" 
            style={{ width: "auto", height: "auto" }} 
          />
          <Image 
            src="/logo-light.png" 
            alt="Pontus" 
            width={90} 
            height={24} 
            className="dark:hidden" 
            style={{ width: "auto", height: "auto" }} 
          />
        </div>
      </div>
      
      <div className="flex-1" />

      {loading ? (
        <Skeleton className="h-8 w-8 md:h-9 md:w-9 rounded-full" />
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 md:h-9 md:w-9 rounded-full ring-2 ring-transparent hover:ring-primary/20 focus-visible:ring-primary/40 transition-all p-0">
              <Avatar className="h-8 w-8 md:h-9 md:w-9 bg-muted">
                <AvatarImage src={user?.tenant_logo_url || ""} alt={user?.tenant_name || "Logo"} className="object-cover" />
                <AvatarFallback className="text-xs font-semibold">
                  {user?.tenant_name ? user.tenant_name.slice(0, 2).toUpperCase() : initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.tenant_name || "Estabelecimento"}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {user?.email || "Usuário"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(routes.admin.perfil)} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(routes.admin.configuracoes)} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}
