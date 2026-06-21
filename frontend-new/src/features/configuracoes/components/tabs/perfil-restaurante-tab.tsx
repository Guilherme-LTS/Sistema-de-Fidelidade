"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Save } from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useRestaurante } from "../../hooks/use-configuracoes"
import { Separator } from "@/components/ui/separator"
import { ImageUpload } from "@/components/ui/image-upload"
import { MapPicker } from "@/components/ui/map-picker"

// Simplified CNPJ mask for UX
const formatCnpj = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18)
}

const formatPhone = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15)
}

const formSchema = z.object({
  name: z.string().min(2, "Nome da empresa é obrigatório"),
  tradingName: z.string().optional(),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  addressLine1: z.string().optional(),
  addressNumber: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().max(2, "Max 2 caracteres").optional().or(z.literal("")),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
  logoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
})

export function PerfilRestauranteTab() {
  const { query, mutation } = useRestaurante()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      tradingName: "",
      document: "",
      phone: "",
      email: "",
      addressLine1: "",
      addressNumber: "",
      addressCity: "",
      addressState: "",
      latitude: "",
      longitude: "",
      logoUrl: "",
    },
  })

  useEffect(() => {
    if (query.data) {
      form.reset({
        name: query.data.name || "",
        tradingName: query.data.tradingName || "",
        document: query.data.document || "",
        phone: query.data.phone || "",
        email: query.data.email || "",
        addressLine1: query.data.addressLine1 || "",
        addressNumber: query.data.addressNumber || "",
        addressCity: query.data.addressCity || "",
        addressState: query.data.addressState || "",
        latitude: query.data.latitude || "",
        longitude: query.data.longitude || "",
        logoUrl: query.data.logoUrl || "",
      })
    }
  }, [query.data, form])

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutation.mutate(values, {
      onSuccess: () => {
        form.reset(values)
      }
    })
  }

  if (query.isLoading) {
    return <div className="p-12 flex justify-center"><Spinner className="w-8 h-8" /></div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil do Restaurante</CardTitle>
        <CardDescription>
          Informações públicas e dados de faturamento do seu negócio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razão Social <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Restaurante S.A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tradingName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Fantasia</FormLabel>
                    <FormControl>
                      <Input placeholder="Opcional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="00.000.000/0000-00" 
                        {...field} 
                        onChange={(e) => field.onChange(formatCnpj(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Logo do Restaurante</FormLabel>
                    <FormControl>
                      <ImageUpload 
                        value={field.value} 
                        onChange={field.onChange} 
                        tenantId={query.data?.id || "unknown"} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />
            <h3 className="text-lg font-medium">Contatos</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail Corporativo</FormLabel>
                    <FormControl>
                      <Input placeholder="contato@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone / WhatsApp</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(00) 00000-0000" 
                        {...field} 
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />
            <h3 className="text-lg font-medium">Endereço</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel>Rua / Avenida</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua das Flores" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="São Paulo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF</FormLabel>
                    <FormControl>
                      <Input placeholder="SP" maxLength={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-border mt-6">
              <div>
                <h4 className="text-sm font-medium mb-1">Localização no Mapa</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Pesquise seu endereço ou clique no mapa para definir a localização exata do restaurante para os clientes.
                </p>
              </div>
              <MapPicker 
                defaultLatitude={form.watch("latitude")} 
                defaultLongitude={form.watch("longitude")}
                onLocationSelect={(lat, lng, details) => {
                  form.setValue("latitude", lat, { shouldDirty: true })
                  form.setValue("longitude", lng, { shouldDirty: true })
                  
                  // Se a busca retornar dados úteis do Nominatim, podemos auto-preencher
                  if (details?.address) {
                    if (details.address.road && !form.getValues("addressLine1")) {
                      form.setValue("addressLine1", details.address.road, { shouldDirty: true })
                    }
                    if (details.address.city || details.address.town) {
                      form.setValue("addressCity", details.address.city || details.address.town, { shouldDirty: true })
                    }
                    // State requires 2 chars but OSM returns full name, better to leave manual
                  }
                }}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={!form.formState.isDirty || mutation.isPending}>
                {mutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
