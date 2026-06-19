"use client"

import React, { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { cadastrarCliente } from "../clientes.api"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { UserPlus, Loader2 } from "lucide-react"

export function NovoClienteModal() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const [nome, setNome] = useState("")
  const [document, setDocument] = useState("")
  const [lgpdConsentimento, setLgpdConsentimento] = useState(false)

  const mutation = useMutation({
    mutationFn: cadastrarCliente,
    onSuccess: () => {
      toast.success("Cliente cadastrado com sucesso!")
      queryClient.invalidateQueries({ queryKey: ["clientes"] })
      setOpen(false)
      // Reset form
      setNome("")
      setDocument("")
      setLgpdConsentimento(false)
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cadastrar cliente.")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ nome, document, lgpdConsentimento })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Cadastrar Cliente</DialogTitle>
            <DialogDescription>
              Adicione um novo cliente ao programa de fidelidade. O CPF é obrigatório.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João da Silva"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="document">CPF</Label>
              <Input
                id="document"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                placeholder="Apenas números"
                maxLength={14}
                required
              />
            </div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending || !lgpdConsentimento}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
