"use client"

import React, { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { cadastrarCliente, Cliente } from "../clientes.api"
import { formatCPF, isValidCPF } from "@/lib/masks"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"

interface ClienteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente?: Cliente | null
}

export function ClienteModal({ open, onOpenChange, cliente }: ClienteModalProps) {
  const queryClient = useQueryClient()

  const [nome, setNome] = useState("")
  const [document, setDocument] = useState("")
  const [lgpdConsentimento, setLgpdConsentimento] = useState(false)

  const isEditing = !!cliente

  useEffect(() => {
    if (open) {
      if (cliente) {
        setNome(cliente.nome || "")
        setDocument(cliente.document || "")
        setLgpdConsentimento(true) // Assumimos que se já existe, tem consentimento ou atualizaremos
      } else {
        setNome("")
        setDocument("")
        setLgpdConsentimento(false)
      }
    }
  }, [open, cliente])

  const mutation = useMutation({
    mutationFn: cadastrarCliente,
    onSuccess: () => {
      toast.success(isEditing ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!")
      queryClient.invalidateQueries({ queryKey: ["clientes"] })
      queryClient.invalidateQueries({ queryKey: ["auditoria"] })
      
      // Update specific queries if needed
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: ["cliente", document] })
      }
      
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.message || `Erro ao ${isEditing ? "atualizar" : "cadastrar"} cliente.`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidCPF(document)) {
      toast.error("CPF inválido. Verifique os números digitados.")
      return
    }
    mutation.mutate({ nome, document, lgpdConsentimento })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Cliente" : "Cadastrar Cliente"}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Edite os dados do cliente. O CPF não pode ser alterado." 
                : "Adicione um novo cliente ao programa de fidelidade. O CPF é obrigatório."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome Completo (Opcional)</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João da Silva"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="document">CPF</Label>
              <Input
                id="document"
                value={document}
                onChange={(e) => setDocument(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                required
                disabled={isEditing}
              />
            </div>
            {!isEditing && (
              <div className="flex items-start gap-2 mt-2">
                <Checkbox
                  id="lgpd"
                  checked={lgpdConsentimento}
                  onCheckedChange={(checked) => setLgpdConsentimento(checked as boolean)}
                  required
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="lgpd" className="text-sm font-normal">
                    O cliente aceita os termos de uso e política de privacidade (LGPD).
                  </Label>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending || (!isEditing && !lgpdConsentimento)}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
