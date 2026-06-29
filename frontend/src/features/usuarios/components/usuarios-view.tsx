"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { useUsuarios } from "../hooks/use-usuarios"
import { Usuario } from "../usuarios.api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, MoreHorizontal, Check, X, ShieldAlert, ShieldCheck, User } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { UsuarioModal } from "./usuario-modal"
import { Card } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"

export function UsuariosView() {
  const { query, alterarStatus, excluir } = useUsuarios()
  const { data: usuarios, isLoading } = query
  const [search, setSearch] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null)
  const [deleteUsuario, setDeleteUsuario] = useState<Usuario | null>(null)

  const filteredUsuarios = usuarios?.filter((u) => {
    const term = search.toLowerCase()
    return (
      u.name.toLowerCase().includes(term) ||
      (u.email && u.email.toLowerCase().includes(term))
    )
  })

  const openModalForCreate = () => {
    setSelectedUsuario(null)
    setIsModalOpen(true)
  }

  const openModalForEdit = (usuario: Usuario) => {
    setSelectedUsuario(usuario)
    setIsModalOpen(true)
  }

  const toggleStatus = (usuario: Usuario) => {
    alterarStatus.mutate({ id: usuario.id, isActive: !usuario.isActive })
  }

  const { user } = useAuth()
  
  // Identificar o proprietário do tenant (dono da conta)
  // O dono é a pessoa cujo auth.user_id é igual ao tenant_id
  const checkIsOwner = (usuario: Usuario) => {
    return usuario.userId === usuario.tenantId
  }

  // Ordenar para que fiquem na ordem alfabética (filtrando o owner)
  const owner = filteredUsuarios?.find(checkIsOwner);
  const sortedUsuarios = [...(filteredUsuarios || [])]
    .filter(u => !checkIsOwner(u))
    .sort((a, b) => a.name.localeCompare(b.name));

  const roleConfig = {
    admin: { label: "Admin", color: "bg-purple-100 text-purple-700 border-purple-200", icon: ShieldAlert },
    operador: { label: "Operador", color: "bg-blue-100 text-blue-700 border-blue-200", icon: ShieldCheck },
    novato: { label: "Novato", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: User },
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    )
  }

  return (
    <Card className="p-4 md:p-6 shadow-sm border-border/40">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button onClick={openModalForCreate} className="h-9 shadow-md transition-all hover:scale-105">
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {owner && (
        <Card className="mb-6 p-4 sm:p-5 bg-primary/5 border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shadow-sm border border-primary/10">
              {owner.name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base sm:text-lg text-foreground">{owner.name}</h3>
                <Badge variant="secondary" className="bg-primary/20 text-primary uppercase text-[10px] sm:text-xs tracking-wider">
                  Conta Principal
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-medium">{owner.email || "Sem e-mail cadastrado"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`gap-1.5 px-2.5 py-1 text-xs ${roleConfig[owner.role].color}`}>
              {(() => { const RoleIcon = roleConfig[owner.role].icon; return <RoleIcon className="w-3.5 h-3.5" />; })()}
              {roleConfig[owner.role].label}
            </Badge>
          </div>
        </Card>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              sortedUsuarios.map((usuario) => {
                const RoleIcon = roleConfig[usuario.role].icon
                return (
                  <TableRow key={usuario.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {usuario.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{usuario.email || "Sem e-mail"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 ${roleConfig[usuario.role].color}`}>
                        <RoleIcon className="w-3 h-3" />
                        {roleConfig[usuario.role].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {usuario.isActive ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                          <Check className="w-4 h-4" /> Ativo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
                          <X className="w-4 h-4" /> Inativo
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(usuario.createdAt), "dd MMM, yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px]">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openModalForEdit(usuario)}>
                            Editar permissões
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => toggleStatus(usuario)}
                            className={usuario.isActive ? "text-amber-600 focus:text-amber-600 focus:bg-amber-100/50" : "text-emerald-600 focus:text-emerald-600 focus:bg-emerald-100/50"}
                          >
                            {usuario.isActive ? "Desativar acesso" : "Reativar acesso"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setDeleteUsuario(usuario)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir funcionário
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <UsuarioModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        usuario={selectedUsuario} 
      />

      <AlertDialog open={!!deleteUsuario} onOpenChange={(open) => !open && setDeleteUsuario(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir funcionário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o acesso de <strong>{deleteUsuario?.name}</strong> ({deleteUsuario?.email})? 
              <br/><br/>
              O histórico de ações deste funcionário será mantido para auditoria, mas ele não poderá mais acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteUsuario) {
                  excluir.mutate(deleteUsuario.id);
                  setDeleteUsuario(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Sim, excluir funcionário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
