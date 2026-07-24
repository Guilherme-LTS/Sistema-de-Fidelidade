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
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"


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

const socialLinkTransform = (base: string) => 
  z.string()
    .transform(val => {
      if (!val) return "";
      val = val.trim();
      if (val.startsWith("http://") || val.startsWith("https://")) return val;
      const username = val.startsWith("@") ? val.substring(1) : val;
      return `${base}${username}`;
    })
    .pipe(z.string().url("URL ou formato inválido").or(z.literal("")))

const websiteTransform = z.string()
  .transform(val => {
    if (!val) return "";
    val = val.trim();
    if (!val.startsWith("http://") && !val.startsWith("https://")) {
      return `https://${val}`;
    }
    return val;
  })
  .pipe(z.string().url("URL inválida").or(z.literal("")))

const formSchema = z.object({
  name: z.string().trim().min(2, "Nome da empresa é obrigatório"),
  tradingName: z.string().trim().optional(),
  document: z.string().refine(val => {
    if (!val) return true;
    return val.replace(/\D/g, "").length === 14;
  }, "CNPJ incompleto ou inválido (deve ter 14 dígitos)").optional(),
  phone: z.string().refine(val => {
    if (!val) return true;
    const digits = val.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 11;
  }, "Telefone deve ter 10 ou 11 dígitos com DDD").optional(),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  addressLine1: z.string().trim().optional(),
  addressNumber: z.string().trim().optional(),
  addressCity: z.string().trim().optional(),
  addressState: z.string().trim().max(2, "Max 2 caracteres").optional().or(z.literal("")),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
  logoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  businessHours: z.record(z.string(), z.object({
    active: z.boolean(),
    open: z.string(),
    close: z.string()
  })).optional(),
  socialLinks: z.object({
    instagram: socialLinkTransform("https://instagram.com/").optional(),
    facebook: socialLinkTransform("https://facebook.com/").optional(),
    tiktok: socialLinkTransform("https://tiktok.com/@").optional(),
    website: websiteTransform.optional(),
  }).optional(),
})

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Segunda-feira' },
  { id: 'tuesday', label: 'Terça-feira' },
  { id: 'wednesday', label: 'Quarta-feira' },
  { id: 'thursday', label: 'Quinta-feira' },
  { id: 'friday', label: 'Sexta-feira' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' },
];

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
      businessHours: {
        monday: { active: false, open: "08:00", close: "18:00" },
        tuesday: { active: false, open: "08:00", close: "18:00" },
        wednesday: { active: false, open: "08:00", close: "18:00" },
        thursday: { active: false, open: "08:00", close: "18:00" },
        friday: { active: false, open: "08:00", close: "18:00" },
        saturday: { active: false, open: "08:00", close: "18:00" },
        sunday: { active: false, open: "08:00", close: "18:00" },
      },
      socialLinks: {
        instagram: "",
        facebook: "",
        tiktok: "",
        website: "",
      }
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
        businessHours: query.data.businessHours || {
          monday: { active: false, open: "08:00", close: "18:00" },
          tuesday: { active: false, open: "08:00", close: "18:00" },
          wednesday: { active: false, open: "08:00", close: "18:00" },
          thursday: { active: false, open: "08:00", close: "18:00" },
          friday: { active: false, open: "08:00", close: "18:00" },
          saturday: { active: false, open: "08:00", close: "18:00" },
          sunday: { active: false, open: "08:00", close: "18:00" },
        },
        socialLinks: {
          instagram: query.data.socialLinks?.instagram || "",
          facebook: query.data.socialLinks?.facebook || "",
          tiktok: query.data.socialLinks?.tiktok || "",
          website: query.data.socialLinks?.website || "",
        },
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

  const onError = (errors: any) => {
    console.error("[PerfilRestaurante] Erros de validação do formulário:", errors)
    toast.error("Existem campos pendentes ou inválidos no formulário.", {
      description: "Verifique os dados informados e tente novamente."
    })
  }

  if (query.isLoading) {
    return <div className="p-12 flex justify-center"><Spinner className="w-8 h-8" /></div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil do Estabelecimento</CardTitle>
        <CardDescription>
          Informações públicas e dados de faturamento do seu negócio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8 pb-20">
            
            {/* Informações Básicas */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Empresa Exemplo Ltda" {...field} />
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
                      <FormLabel>Logo do Estabelecimento</FormLabel>
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
            </div>

            <Separator />
            
            {/* Contatos */}
            <div className="space-y-4">
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
            </div>

            <Separator />
            
            {/* Localização */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Localização</h3>
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Pesquise seu estabelecimento pelo nome ou endereço para preenchermos seus dados automaticamente.
                </p>
              </div>
              <MapPicker 
                defaultLatitude={form.watch("latitude")} 
                defaultLongitude={form.watch("longitude")}
                isDirty={form.formState.isDirty}
                onLocationSelect={(lat, lng, details) => {
                  form.setValue("latitude", lat, { shouldDirty: true, shouldValidate: true })
                  form.setValue("longitude", lng, { shouldDirty: true, shouldValidate: true })
                  
                  if (details) {
                    if (details.street) form.setValue("addressLine1", details.street, { shouldDirty: true, shouldValidate: true })
                    if (details.number) form.setValue("addressNumber", details.number, { shouldDirty: true, shouldValidate: true })
                    if (details.city) form.setValue("addressCity", details.city, { shouldDirty: true, shouldValidate: true })
                    if (details.state) {
                      const sanitizedUf = details.state.replace(/[^a-zA-Z]/g, "").substring(0, 2).toUpperCase()
                      form.setValue("addressState", sanitizedUf, { shouldDirty: true, shouldValidate: true })
                    }
                  }
                }}
              />
            </div>

            <div className="border rounded-md p-4 bg-muted/20">
              <details className="group">
                <summary className="text-sm font-medium cursor-pointer list-none flex justify-between items-center text-muted-foreground hover:text-foreground transition-colors">
                  Ajustar endereço manualmente
                  <span className="group-open:rotate-180 transition-transform text-xs">▼</span>
                </summary>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t">
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
                        <FormLabel>Número / Complemento</FormLabel>
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
                          <Input 
                            placeholder="SP" 
                            maxLength={2} 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </details>
            </div>

            <Separator />
            
            {/* Redes Sociais */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Redes Sociais</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="socialLinks.instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <Input placeholder="https://instagram.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <FormField
                control={form.control}
                name="socialLinks.facebook"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook</FormLabel>
                    <FormControl>
                      <Input placeholder="https://facebook.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="socialLinks.tiktok"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TikTok</FormLabel>
                    <FormControl>
                      <Input placeholder="https://tiktok.com/@..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="socialLinks.website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site Oficial</FormLabel>
                    <FormControl>
                      <Input placeholder="https://seusite.com.br" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                </div>
              </div>

            <Separator />
            
            {/* Horário de Funcionamento */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Horário de Funcionamento</h3>
              <div className="space-y-4 border border-border rounded-xl p-4 bg-muted/5">
                <div className="hidden md:grid grid-cols-[1fr_80px_100px_100px] gap-4 items-center text-sm font-semibold text-muted-foreground mb-2 px-2">
                <div>Dia da Semana</div>
                <div className="text-center">Status</div>
                <div className="text-center">Abertura</div>
                <div className="text-center">Fechamento</div>
              </div>
              
              <div className="space-y-3 md:space-y-1">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.id} className="flex flex-col md:grid md:grid-cols-[1fr_80px_100px_100px] gap-3 md:gap-4 md:items-center p-3 md:p-2 border md:border-transparent rounded-lg hover:bg-muted/30 transition-colors bg-card md:bg-transparent shadow-sm md:shadow-none">
                    
                    <div className="flex justify-between items-center w-full md:block">
                      <span className="font-medium text-foreground">{day.label}</span>
                      <div className="md:hidden">
                        <FormField
                          control={form.control}
                          name={`businessHours.${day.id}.active`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="hidden md:flex justify-center">
                      <FormField
                        control={form.control}
                        name={`businessHours.${day.id}.active`}
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 md:contents">
                      <div className="flex-1 md:block">
                        <FormField
                          control={form.control}
                          name={`businessHours.${day.id}.open`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <Input 
                                  type="time" 
                                  {...field} 
                                  disabled={!form.watch(`businessHours.${day.id}.active`)}
                                  className="text-center font-medium"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <span className="text-muted-foreground text-sm md:hidden">até</span>
                      <div className="flex-1 md:block">
                        <FormField
                          control={form.control}
                          name={`businessHours.${day.id}.close`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormControl>
                                <Input 
                                  type="time" 
                                  {...field} 
                                  disabled={!form.watch(`businessHours.${day.id}.active`)}
                                  className="text-center font-medium"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
            </div>

            {form.formState.isDirty && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur-sm border border-border shadow-2xl p-2 rounded-full flex items-center justify-between sm:justify-start gap-2 animate-in slide-in-from-bottom-10 fade-in duration-300 w-[calc(100%-2rem)] sm:w-auto">
                <span className="text-sm font-semibold ml-4 text-foreground hidden sm:inline-block whitespace-nowrap">
                  Alterações não salvas
                </span>
                <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => form.reset()} 
                    className="rounded-full px-4 hover:bg-destructive/10 hover:text-destructive"
                  >
                    Descartar
                  </Button>
                  <Button type="submit" size="sm" disabled={mutation.isPending} className="rounded-full px-6 shadow-sm">
                    {mutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
