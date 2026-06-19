"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRecompensas } from "../hooks/use-recompensas"
import { Recompensa } from "../recompensas.api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Gift, Plus, Pencil, Trash, AlertCircle } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"

const recompensaSchema = z.object({
  name: z.string().min(2, "O nome deve ter no mínimo 2 caracteres."),
  description: z.string().optional(),
  pointsCost: z.coerce.number().min(1, "O custo deve ser maior que zero."),
  isActive: z.boolean().default(true),
})

type RecompensaForm = z.infer<typeof recompensaSchema>

export function CatalogoView() {
  const { recompensas, isLoading, criar, atualizar, excluir } = useRecompensas()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecompensa, setEditingRecompensa] = useState<Recompensa | null>(null)
  const [deletingRecompensa, setDeletingRecompensa] = useState<Recompensa | null>(null)

  const form = useForm<RecompensaForm>({
    resolver: zodResolver(recompensaSchema),
    defaultValues: {
      name: "",
      description: "",
      pointsCost: 10,
      isActive: true,
    },
  })

  const openNewModal = () => {
    setEditingRecompensa(null)
    form.reset({
      name: "",
      description: "",
      pointsCost: 10,
      isActive: true,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (r: Recompensa) => {
    setEditingRecompensa(r)
    form.reset({
      name: r.name,
      description: r.description || "",
      pointsCost: r.pointsCost,
      isActive: r.isActive,
    })
    setIsModalOpen(true)
  }

  const onSubmit = (data: RecompensaForm) => {
    if (editingRecompensa) {
      atualizar.mutate({ id: editingRecompensa.id, payload: data }, {
        onSuccess: () => setIsModalOpen(false)
      })
    } else {
      criar.mutate(data, {
        onSuccess: () => setIsModalOpen(false)
      })
    }
  }

  const confirmDelete = () => {
    if (deletingRecompensa) {
      excluir.mutate(deletingRecompensa.id, {
        onSuccess: () => setDeletingRecompensa(null)
      })
    }
  }

  const toggleAtivo = (r: Recompensa, checked: boolean) => {
    atualizar.mutate({ id: r.id, payload: { isActive: checked } })
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Carregando catálogo...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Catálogo de Recompensas</h2>
          <p className="text-muted-foreground">
            Gerencie os prêmios disponíveis para resgate.
          </p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="mr-2 h-4 w-4" /> Nova Recompensa
        </Button>
      </div>

      {recompensas.length === 0 ? (
        <div className="text-center p-12 border border-dashed rounded-lg">
          <Gift className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhuma recompensa cadastrada</h3>
          <p className="text-muted-foreground mb-4">Adicione prêmios para que os clientes possam resgatar.</p>
          <Button variant="outline" onClick={openNewModal}>Criar a primeira recompensa</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recompensas.map((r: Recompensa) => (
            <Card key={r.id} className={`flex flex-col ${!r.isActive ? 'opacity-60' : ''}`}>
              <CardHeader className="bg-primary/5 pb-4">
                <div className="flex justify-between items-start">
                  <div className="bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full">
                    {r.pointsCost} pts
                  </div>
                  {!r.isActive && (
                    <span className="text-xs bg-muted px-2 py-1 rounded border">Inativo</span>
                  )}
                </div>
                <CardTitle className="mt-4">{r.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pt-4">
                <CardDescription className="text-sm">
                  {r.description || "Nenhuma descrição informada."}
                </CardDescription>
              </CardContent>
              <CardFooter className="flex justify-between items-center border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={r.isActive} 
                    onCheckedChange={(checked) => toggleAtivo(r, checked)} 
                    disabled={atualizar.isPending}
                  />
                  <Label className="text-xs">{r.isActive ? 'Ativo' : 'Pausado'}</Label>
                </div>
                <div>
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeletingRecompensa(r)}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecompensa ? "Editar Recompensa" : "Nova Recompensa"}</DialogTitle>
            <DialogDescription>
              Defina o nome, o custo em pontos e se o prêmio está disponível no catálogo ativo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Prêmio</Label>
              <Input {...form.register("name")} placeholder="Ex: Casquinha Trufada" />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Custo em Pontos</Label>
              <Input type="number" {...form.register("pointsCost")} />
              {form.formState.errors.pointsCost && (
                <p className="text-sm text-destructive">{form.formState.errors.pointsCost.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Descrição (Opcional)</Label>
              <Input {...form.register("description")} placeholder="Ex: Válido para qualquer sabor tradicional." />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="isActive" 
                checked={form.watch("isActive")}
                onCheckedChange={(c) => form.setValue("isActive", c as boolean)}
              />
              <Label htmlFor="isActive" className="cursor-pointer">Ativo no catálogo</Label>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending || atualizar.isPending}>
                {criar.isPending || atualizar.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <Dialog open={!!deletingRecompensa} onOpenChange={(open) => !open && setDeletingRecompensa(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Recompensa</DialogTitle>
            <DialogDescription>
              Você tem certeza que deseja remover a recompensa <strong>{deletingRecompensa?.name}</strong>? Esta ação a removerá do catálogo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setDeletingRecompensa(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={excluir.isPending}>
              {excluir.isPending ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
