"use client"

import { useState, useRef } from "react"
import { supabaseAdminClient as supabase } from "@/lib/supabase-clients"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { UploadCloud, X, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { getStoredAdminToken as getStoredAccessToken } from "@/lib/auth/session"

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  tenantId: string
  bucket?: string
}

export function ImageUpload({ value, onChange, tenantId, bucket = "tenant-logos" }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true)

      // Get user session to upload securely
      const token = getStoredAccessToken()
      if (!token) throw new Error("Não autenticado")

      // Configurar a sessão temporária para o Supabase Client
      await supabase.auth.setSession({ access_token: token, refresh_token: "" })

      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${Date.now()}.${fileExt}`
      const filePath = `${tenantId}/${fileName}`

      // Upload file (upsert false pois o nome do arquivo é sempre único devido ao Date.now)
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: false })

      if (uploadError) {
        throw uploadError
      }

      // Obter URL Pública
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
      onChange(data.publicUrl)
      toast.success("Imagem carregada com sucesso!")
    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error("Erro ao fazer upload da imagem.")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    // Validação de tipo e tamanho (max 2MB)
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem.")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.")
      return
    }

    handleUpload(file)
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div className="flex items-center gap-6">
        {value ? (
          <div 
            className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border bg-muted cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <img 
              src={value} 
              alt="Logo" 
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange("")
              }}
              className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div 
            className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-md border bg-muted border-dashed cursor-pointer hover:bg-accent transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            Selecionar Nova Logo
          </Button>
          <p className="text-xs text-muted-foreground">
            Recomendado: PNG ou JPG em formato quadrado. Máx 2MB.
          </p>
        </div>
      </div>
    </div>
  )
}
