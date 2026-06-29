import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUsuarios } from "../hooks/use-usuarios"
import { Usuario } from "../usuarios.api"
import { AlertCircle } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string()
    .email("E-mail com formato inválido")
    .refine((e) => !e.endsWith("."), "O e-mail não pode terminar com ponto")
    .refine(
      (e) => !e.endsWith("@gmail") && !e.endsWith("@hotmail") && !e.endsWith("@yahoo") && !e.endsWith("@outlook"), 
      "Domínio incompleto (ex: está faltando .com ou .com.br)"
    )
    .optional().or(z.literal("")),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
  role: z.enum(["admin", "operador", "novato"]),
}).superRefine((data, ctx) => {
  // Apenas validar a obrigatoriedade no frontend superficialmente
})

interface UsuarioModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuario?: Usuario | null
}

export function UsuarioModal({ open, onOpenChange, usuario }: UsuarioModalProps) {
  const isEditing = !!usuario
  const { criar, atualizar } = useUsuarios()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "operador" as "admin" | "operador" | "novato",
    },
  })

  useEffect(() => {
    if (open) {
      if (usuario) {
        reset({
          name: usuario.name,
          email: usuario.email || "",
          password: "",
          role: usuario.role,
        })
      } else {
        reset({
          name: "",
          email: "",
          password: "",
          role: "operador",
        })
      }
    }
  }, [open, usuario, reset])

  const onSubmit = async (data: any) => {
    if (isEditing) {
      atualizar.mutate(
        { id: usuario.id, data: { name: data.name, role: data.role } },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      if (!data.email) {
        return; // Impede envio sem email na criação
      }
      criar.mutate(
        { name: data.name, email: data.email, password: data.password || undefined, role: data.role },
        { onSuccess: () => onOpenChange(false) }
      )
    }
  }

  const roleLabels = {
    admin: "Administrador (Acesso total)",
    operador: "Operador (Dashboard e Operação)",
    novato: "Novato (Apenas saldo e resgate)",
  }

  const roleSelected = watch("role")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Edite as permissões ou o nome do usuário da sua equipe." 
              : "Crie um novo acesso para um funcionário. O e-mail será usado para o login."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" placeholder="Ex: João Silva" {...register("name")} />
            {errors.name && <span className="text-xs text-destructive">{errors.name.message?.toString()}</span>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail {isEditing && "(Não editável)"}</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="Ex: joao@restaurante.com" 
              {...register("email")} 
              disabled={isEditing}
            />
            {errors.email && <span className="text-xs text-destructive">{errors.email.message?.toString()}</span>}
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="password">Senha provisória (Opcional)</Label>
              <Input 
                id="password" 
                type="text" 
                placeholder="Se vazio, será gerada uma senha padrão" 
                {...register("password")} 
              />
              <p className="text-xs text-muted-foreground">Senha padrão: Restaurante@123</p>
              {errors.password && <span className="text-xs text-destructive">{errors.password.message?.toString()}</span>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Nível de Acesso (Perfil)</Label>
            <Select value={roleSelected} onValueChange={(val) => setValue("role", val as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
                <SelectItem value="novato">Novato</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" />
              {roleLabels[roleSelected as keyof typeof roleLabels]}
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criar.isPending || atualizar.isPending || (!isEditing && !isValid)}>
              {isEditing ? "Salvar alterações" : "Criar usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
