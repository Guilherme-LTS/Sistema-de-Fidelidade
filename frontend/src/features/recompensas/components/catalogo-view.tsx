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
import { Badge } from "@/components/ui/badge"
import { Gift, Plus, Pencil, Trash, Award, Image as ImageIcon, X } from "lucide-react"
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
import { PageContainer } from "@/components/layout/page-container"
import { supabaseAdminClient as supabase } from "@/lib/supabase-clients"
import { useAuth } from "@/lib/auth/auth-context"
import { toast } from "sonner"

const recompensaSchema = z.object({
  name: z.string().min(2, "O nome deve ter no mínimo 2 caracteres."),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  pointsCost: z.coerce.number().min(1, "O custo deve ser maior que zero."),
  isActive: z.boolean().default(true),
})

type RecompensaForm = z.infer<typeof recompensaSchema>

export function CatalogoView() {
  const { user } = useAuth()
  const { recompensas, isLoading, criar, atualizar, excluir } = useRecompensas()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecompensa, setEditingRecompensa] = useState<Recompensa | null>(null)
  const [deletingRecompensa, setDeletingRecompensa] = useState<Recompensa | null>(null)
  
  // States for Image Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const form = useForm<RecompensaForm>({
    resolver: zodResolver(recompensaSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
      pointsCost: 10,
      isActive: true,
    },
  })

  const openNewModal = () => {
    setEditingRecompensa(null)
    setSelectedFile(null)
    setPreviewUrl(null)
    form.reset({
      name: "",
      description: "",
      imageUrl: "",
      pointsCost: 10,
      isActive: true,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (r: Recompensa) => {
    setEditingRecompensa(r)
    setSelectedFile(null)
    setPreviewUrl(r.imageUrl || null)
    form.reset({
      name: r.name,
      description: r.description || "",
      imageUrl: r.imageUrl || "",
      pointsCost: r.pointsCost,
      isActive: r.isActive,
    })
    setIsModalOpen(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        toast.error("Formato inválido. Apenas JPG, PNG e WebP são aceitos.")
        return
      }
      
      const maxSizeInBytes = 2 * 1024 * 1024 // 2MB
      if (file.size > maxSizeInBytes) {
        toast.error("A imagem é muito grande. O limite máximo é de 2MB.")
        return
      }

      setSelectedFile(file)
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
    }
  }

  const clearImage = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    form.setValue("imageUrl", "")
  }

  const deleteOldImage = async (url: string) => {
    try {
      const urlParts = url.split('/tenant-rewards/')
      if (urlParts.length === 2) {
        const path = urlParts[1]
        await supabase.storage.from('tenant-rewards').remove([path])
      }
    } catch (e) {
      console.error("Erro ao deletar imagem antiga", e)
    }
  }

  const onSubmit = async (data: RecompensaForm) => {
    let finalImageUrl = data.imageUrl

    if (selectedFile && user?.tenant_id) {
      setIsUploading(true)
      try {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${user.tenant_id}/${fileName}`

        const { error } = await supabase.storage
          .from("tenant-rewards")
          .upload(filePath, selectedFile)
          
        if (error) throw error

        const { data: publicUrlData } = supabase.storage
          .from("tenant-rewards")
          .getPublicUrl(filePath)
        
        finalImageUrl = publicUrlData.publicUrl
      } catch (err) {
        console.error("Erro no upload", err)
        toast.error("Não foi possível fazer o upload da imagem.")
        setIsUploading(false)
        return // Aborta o processo se o upload falhou
      } finally {
        setIsUploading(false)
      }
    } else if (selectedFile && !user?.tenant_id) {
      toast.error("Erro de sessão. ID do restaurante não encontrado.")
      return
    }

    if (editingRecompensa && editingRecompensa.imageUrl && editingRecompensa.imageUrl !== finalImageUrl) {
      // Clean up the old image from storage if it was changed or removed
      await deleteOldImage(editingRecompensa.imageUrl)
    }

    const finalData = { ...data, imageUrl: finalImageUrl }

    if (editingRecompensa) {
      atualizar.mutate({ id: editingRecompensa.id, payload: finalData }, {
        onSuccess: () => setIsModalOpen(false)
      })
    } else {
      criar.mutate(finalData, {
        onSuccess: () => setIsModalOpen(false)
      })
    }
  }

  const confirmDelete = () => {
    if (deletingRecompensa) {
      if (deletingRecompensa.imageUrl) {
        deleteOldImage(deletingRecompensa.imageUrl)
      }
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
    <PageContainer
      title="Catálogo de Recompensas"
      description="Gerencie os prêmios disponíveis para resgate."
      actions={
        <Button onClick={openNewModal}>
          <Plus className="mr-2 h-4 w-4" /> Nova Recompensa
        </Button>
      }
    >
      <div className="space-y-6">

      {recompensas.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-muted/10 animate-fade-in">
          <Gift className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">Nenhuma recompensa cadastrada</h3>
          <p className="text-muted-foreground mb-6">Adicione prêmios para que os clientes possam resgatar.</p>
          <Button variant="outline" onClick={openNewModal}>Criar a primeira recompensa</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recompensas.map((r: Recompensa) => (
            <Card key={r.id} className={`p-0 overflow-hidden flex flex-col h-full transition-all duration-200 border-border shadow-sm group ${!r.isActive ? 'opacity-70 grayscale-[0.2]' : 'hover:shadow-md hover:border-primary/20'}`}>
              <CardHeader className="p-0 border-b border-border relative min-h-[160px] flex flex-col justify-end overflow-hidden">
                {r.imageUrl ? (
                  <>
                    {/* Fundo desfocado para preencher espaço de imagens com proporções diferentes */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center blur-md scale-110 opacity-60 dark:opacity-40"
                      style={{ backgroundImage: `url(${r.imageUrl})` }}
                    />
                    {/* Imagem principal sem cortes (contain) */}
                    <img 
                      src={r.imageUrl} 
                      alt={r.name}
                      className="absolute inset-0 w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105 drop-shadow-lg"
                    />
                    {/* Gradiente escuro para garantir leitura do texto que fica por cima */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                    <Gift className="w-16 h-16 text-primary/20" />
                  </div>
                )}
                
                <div className="relative p-6 pt-12 w-full">
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-start gap-4">
                    <Badge variant="secondary" className={`${r.imageUrl ? 'bg-black/50 text-white hover:bg-black/70' : 'bg-primary/10 text-primary hover:bg-primary/20'} font-bold border-none px-3 py-1 text-sm flex items-center gap-1 backdrop-blur-md`}>
                      <Award className="w-3.5 h-3.5" />
                      {r.pointsCost} pts
                    </Badge>
                    {!r.isActive && (
                      <Badge variant="outline" className={`text-xs border-none backdrop-blur-md ${r.imageUrl ? 'bg-black/50 text-white/80' : 'bg-muted/50 text-muted-foreground'}`}>Inativo</Badge>
                    )}
                  </div>
                  <CardTitle className={`leading-tight text-xl ${r.imageUrl ? 'text-white' : 'text-foreground'}`}>{r.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-6 flex flex-col">
                <CardDescription className="text-sm">
                  {r.description || "Nenhuma descrição informada."}
                </CardDescription>
              </CardContent>
              <CardFooter className="flex justify-between items-center border-t border-border bg-muted/10 p-4 px-6 mt-auto">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id={`switch-${r.id}`}
                    checked={r.isActive} 
                    onCheckedChange={(checked) => toggleAtivo(r, checked)} 
                    disabled={atualizar.isPending}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <Label htmlFor={`switch-${r.id}`} className="text-xs cursor-pointer select-none font-medium text-muted-foreground">{r.isActive ? 'Ativo' : 'Pausado'}</Label>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => openEditModal(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingRecompensa(r)}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open && isUploading) return // Prevent closing while uploading
        setIsModalOpen(open)
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingRecompensa ? "Editar Recompensa" : "Nova Recompensa"}</DialogTitle>
            <DialogDescription>
              Defina os detalhes e uma imagem atraente para o prêmio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            
            <div className="space-y-2">
              <Label>Imagem (Opcional)</Label>
              <div className="flex flex-col gap-3">
                {previewUrl ? (
                  <div className="relative w-full h-[120px] rounded-md overflow-hidden border border-border group">
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${previewUrl})` }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button type="button" variant="destructive" size="sm" onClick={clearImage} className="h-8 text-xs">
                        <Trash className="w-3.5 h-3.5 mr-1" /> Remover Imagem
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Label 
                    htmlFor="image-upload" 
                    className="flex flex-col items-center justify-center w-full h-[120px] rounded-md border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-muted-foreground">
                      <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm font-medium">Clique para enviar uma foto</p>
                      <p className="text-xs opacity-70">PNG, JPG até 5MB</p>
                    </div>
                    <Input 
                      id="image-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileSelect}
                    />
                  </Label>
                )}
              </div>
            </div>

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
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isUploading}>Cancelar</Button>
              <Button type="submit" disabled={criar.isPending || atualizar.isPending || isUploading}>
                {isUploading ? "Enviando Imagem..." : (criar.isPending || atualizar.isPending) ? "Salvando..." : "Salvar"}
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
    </PageContainer>
  )
}
