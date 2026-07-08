"use client"

import { use, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { carregarTenantConsumer, carregarExtratoConsumer } from "@/features/consumer/consumer.api"
import { Spinner } from "@/components/ui/spinner"
import { LogOut, MapPin, Store, Gift, ChevronLeft, ChevronRight, Lock, Map, Clock, ArrowRight, Instagram, Facebook, Music2, MessageCircle, ArrowLeft, History, Star, Receipt, CheckCircle2, XCircle, Hourglass, Globe, Phone, Mail } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export default function TenantDashboardPage(props: PageProps) {
  const params = use(props.params)
  const [currentPage, setCurrentPage] = useState(1)
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tenant-details", params.slug],
    queryFn: () => carregarTenantConsumer(params.slug),
    retry: 1,
  })

  const { data: historyData } = useQuery({
    queryKey: ["tenant-history", params.slug],
    queryFn: () => carregarExtratoConsumer(params.slug),
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="space-y-6 text-center py-12">
        <h2 className="text-xl font-semibold text-foreground">Restaurante não encontrado</h2>
        <p className="text-muted-foreground">Você não possui vínculo com este restaurante ou ele não existe.</p>
        <Link href="/painel" className="text-primary hover:underline inline-flex items-center font-medium mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o painel
        </Link>
      </div>
    )
  }

  const { tenant, rewards, summary } = data
  const { pontos_disponiveis } = summary

  // Identifica a próxima recompensa
  const unachievableRewards = rewards
    .filter(r => r.pointsCost > pontos_disponiveis)
    .sort((a, b) => a.pointsCost - b.pointsCost)
  const nextReward = unachievableRewards[0] || null

  const addressQuery = tenant.latitude && tenant.longitude
    ? `${tenant.latitude},${tenant.longitude}`
    : encodeURIComponent(`${tenant.name} ${tenant.addressLine1} ${tenant.addressNumber} ${tenant.addressCity}`)
    
  const mapEmbedUrl = `https://maps.google.com/maps?q=${addressQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`
  const openMapsUrl = tenant.latitude && tenant.longitude
    ? `https://maps.google.com/?q=${tenant.latitude},${tenant.longitude}`
    : `https://maps.google.com/?q=${addressQuery}`

  const formatPhoneToWhatsapp = (phone: string | null) => {
    if (!phone) return null
    const cleaned = phone.replace(/\D/g, '')
    return `https://wa.me/55${cleaned}`
  }
  const whatsappUrl = formatPhoneToWhatsapp(tenant.phone)

  // Business Hours Logic
  const DAYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const DAYS_MAP: Record<string, string> = {
    monday: "Segunda-feira",
    tuesday: "Terça-feira",
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira",
    saturday: "Sábado",
    sunday: "Domingo"
  };

  const jsDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const currentDayIndex = new Date().getDay();
  const todayKey = jsDays[currentDayIndex];
  const todayHours = tenant.businessHours?.[todayKey];

  let isOpenNow = false;
  if (todayHours?.active) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = (todayHours.open || "00:00").split(":").map(Number);
    const [closeH, closeM] = (todayHours.close || "00:00").split(":").map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    
    if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
      isOpenNow = true;
    }
  }

  return (
    <div className="space-y-6 pb-12 px-4 md:px-6 lg:px-0 max-w-6xl mx-auto">
      <div className="flex items-center justify-between pt-4 md:pt-0">
        <Link href="/painel" className="text-muted-foreground hover:text-foreground inline-flex items-center text-sm transition-colors py-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Meus Pontos
        </Link>
      </div>

      {/* Header Estilo Capa Spotify/Modern SaaS */}
      <div className="relative rounded-2xl overflow-hidden border shadow-sm bg-card">
        {/* Background Banner */}
        <div className="absolute inset-0 h-32 md:h-40 overflow-hidden bg-muted">
          {tenant.logoUrl ? (
            <div 
              className="absolute inset-0 opacity-80"
              style={{
                backgroundImage: `url(${tenant.logoUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-80" />
          )}
          {/* Subtle overlay to guarantee contrast */}
          <div className="absolute inset-0 bg-black/30" />
          {/* Gradient fade to background color */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
        </div>

        <div className="relative pt-20 md:pt-24 px-4 pb-6 md:px-8 flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 text-center md:text-left">
          {/* Logo container */}
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-card shadow-xl flex items-center justify-center p-1 border-4 border-card shrink-0 z-10 overflow-hidden">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="w-full h-full rounded-full object-contain" />
            ) : (
              <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold">
                {tenant.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="flex-1 space-y-1.5 md:space-y-1 z-10 md:pb-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{tenant.name}</h1>
            {tenant.addressLine1 && (
              <p className="text-muted-foreground text-sm flex items-center justify-center md:justify-start gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="line-clamp-2 md:line-clamp-1 max-w-[280px] sm:max-w-md font-medium">
                  {tenant.addressLine1}{tenant.addressNumber ? `, ${tenant.addressNumber}` : ''}
                  {tenant.addressCity ? ` - ${tenant.addressCity}` : ''}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda (Principal) - lg:col-span-2 */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Saldo Atual */}
            <Card className="bg-card shadow-sm border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Saldo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tighter text-foreground">{pontos_disponiveis}</span>
                      <span className="text-muted-foreground font-medium">pontos</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Star className="h-6 w-6 text-primary fill-primary/20" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Próximo Objetivo */}
            <Card className="bg-card shadow-sm border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Gift className="h-4 w-4" /> Próximo Objetivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextReward ? (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold tracking-tighter text-foreground">Faltam {nextReward.pointsCost - pontos_disponiveis}</span>
                      <span className="text-muted-foreground font-medium text-sm">pontos</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate" title={nextReward.name}>
                      Para resgatar: <strong className="font-medium text-foreground">{nextReward.name}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="flex h-full items-center">
                    <p className="text-sm text-muted-foreground">Você possui saldo para resgatar todas as recompensas!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Catálogo de Recompensas */}
          <Card className="shadow-sm border">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" /> Catálogo de Prêmios
              </CardTitle>
              <CardDescription>
                Resgate recompensas exclusivas com seus pontos acumulados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rewards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-xl bg-muted/20">
                  <Gift className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-center">Nenhuma recompensa ativa no momento.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {rewards.map(reward => {
                    const isRedeemable = pontos_disponiveis >= reward.pointsCost;
                    return (
                      <div 
                        key={reward.id} 
                        className={`relative rounded-xl border p-0 flex flex-col transition-all overflow-hidden ${
                          isRedeemable 
                            ? 'bg-card border-primary/20 shadow-sm hover:border-primary/50 hover:shadow-md' 
                            : 'bg-muted/30 border-border opacity-80'
                        }`}
                      >
                        {/* Image Header Area - Preserving aspect ratio elegantly */}
                        {reward.imageUrl ? (
                          <div className="relative h-40 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border-b border-border/50 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 transition-colors">
                            {/* Blurred background to fill empty space for vertical/horizontal mismatched images */}
                            <div 
                              className="absolute inset-0 bg-cover bg-center blur-md scale-110 opacity-30 dark:opacity-50"
                              style={{ backgroundImage: `url(${reward.imageUrl})` }}
                            />
                            {/* Uncropped main image */}
                            <img 
                              src={reward.imageUrl} 
                              alt={reward.name}
                              className="relative z-10 w-full h-full object-contain p-2 drop-shadow-md transition-transform duration-500 hover:scale-105"
                            />
                          </div>
                        ) : (
                          <div className="relative h-40 w-full overflow-hidden bg-primary/5 flex items-center justify-center border-b border-border/50">
                            <Gift className="w-12 h-12 text-primary/20" />
                          </div>
                        )}
                        
                        <div className="p-4 flex flex-col flex-1">
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <h3 className="font-semibold text-base leading-tight">{reward.name}</h3>
                            {isRedeemable && (
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1 shadow-[0_0_8px_rgba(16,185,129,0.6)]" title="Resgatável" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 flex-1 mb-4">
                            {reward.description || "Nenhuma descrição detalhada."}
                          </p>
                          
                          <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                            <span className="font-bold text-lg text-primary flex items-center gap-1">
                              {reward.pointsCost} <Star className="h-4 w-4 fill-primary/50" />
                            </span>
                            {!isRedeemable && (
                              <span className="text-xs font-medium text-muted-foreground">
                                Faltam {reward.pointsCost - pontos_disponiveis} pts
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" /> Extrato
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="font-normal text-xs">Última: {summary.last_transaction_date ? new Date(summary.last_transaction_date).toLocaleDateString('pt-BR') : 'Nenhuma'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(() => {
                if (!historyData) return <div className="flex justify-center p-8"><Spinner className="w-6 h-6" /></div>;
                
                if (historyData.history.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-8 bg-muted/10">
                      <Receipt className="h-8 w-8 text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground text-sm text-center max-w-sm px-4">
                        Você ainda não possui transações registradas neste estabelecimento.
                      </p>
                    </div>
                  );
                }

                const ITEMS_PER_PAGE = 5;
                const totalPages = Math.ceil(historyData.history.length / ITEMS_PER_PAGE);
                const paginatedHistory = historyData.history.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

                return (
                  <div className="flex flex-col">
                    <div className="divide-y">
                      {paginatedHistory.map(item => {
                        const isEarn = item.type === 'earn';
                        const isExpire = item.type === 'expire';

                        let bgColor = 'bg-rose-100 text-rose-600';
                        let textColor = 'text-rose-600';
                        let Icon = XCircle;
                        let sign = '-';
                        let title = item.description;
                        let subtitle = new Date(item.createdAt).toLocaleString('pt-BR');

                        if (isEarn) {
                          bgColor = 'bg-emerald-100 text-emerald-600';
                          textColor = 'text-emerald-600';
                          Icon = CheckCircle2;
                          sign = '+';
                          title = 'Pontos Acumulados';
                          subtitle = `${item.description} • ${new Date(item.createdAt).toLocaleDateString('pt-BR')}`;
                        } else if (isExpire) {
                          bgColor = 'bg-orange-100 text-orange-600';
                          textColor = 'text-orange-600';
                          Icon = Hourglass;
                          sign = '-';
                          title = 'Pontos Expirados';
                          subtitle = `${item.description} • ${new Date(item.createdAt).toLocaleDateString('pt-BR')}`;
                        } else if (item.type === 'spend') {
                          bgColor = 'bg-accent/10 text-accent';
                          textColor = 'text-accent';
                          Icon = ArrowRight;
                          sign = '-';
                          title = 'Resgate Realizado';
                          subtitle = `${item.description} • ${new Date(item.createdAt).toLocaleDateString('pt-BR')}`;
                        }

                        return (
                          <div key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors border-b last:border-0 border-border/50">
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bgColor}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold leading-tight pr-2 text-foreground">{title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                              </div>
                            </div>
                            <div className={`font-bold whitespace-nowrap pl-2 ${textColor}`}>
                              {sign}{item.points} pts
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {totalPages > 1 && (
                      <div className="p-3 border-t bg-muted/5 flex items-center justify-between">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        >
                          Anterior
                        </Button>
                        <span className="text-xs text-muted-foreground font-medium">
                          Página {currentPage} de {totalPages}
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        >
                          Próxima
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita (Sidebar) - lg:col-span-1 */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Mapa e Localização */}
          <Card className="shadow-sm border overflow-hidden flex flex-col">
            <div className="w-full h-48 bg-muted relative">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={mapEmbedUrl}
              ></iframe>
              <Button 
                size="sm" 
                variant="secondary" 
                className="absolute top-2 left-2 shadow-md gap-2"
                onClick={() => window.open(openMapsUrl, '_blank')}
              >
                <MapPin className="h-4 w-4" /> Abrir no App
              </Button>
            </div>
            
            <CardContent className="p-5 space-y-4">
              {tenant.addressLine1 ? (
                <div>
                  <p className="text-sm text-foreground font-medium mb-1">Endereço</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tenant.addressLine1}{tenant.addressNumber ? `, ${tenant.addressNumber}` : ''}
                    <br />
                    {tenant.addressCity ? `${tenant.addressCity}${tenant.addressState ? ` - ${tenant.addressState}` : ''}` : ''}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">Endereço não cadastrado</p>
              )}

              {/* Botões de Contato Dinâmicos (Ícones) */}
              <TooltipProvider delayDuration={300}>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-border/50">
                  {whatsappUrl && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700 border-green-500/20 w-11 h-11" 
                          onClick={() => window.open(whatsappUrl, "_blank", "noopener,noreferrer")}
                        >
                          <MessageCircle className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>WhatsApp</p></TooltipContent>
                    </Tooltip>
                  )}
                  {tenant.socialLinks?.instagram && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline"
                          size="icon" 
                          className="rounded-full bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 hover:text-pink-700 border-pink-500/20 w-11 h-11" 
                          onClick={() => window.open(tenant.socialLinks!.instagram!, "_blank", "noopener,noreferrer")}
                        >
                          <Instagram className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Instagram</p></TooltipContent>
                    </Tooltip>
                  )}
                  {tenant.socialLinks?.facebook && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 hover:text-blue-700 border-blue-500/20 w-11 h-11" 
                          onClick={() => window.open(tenant.socialLinks!.facebook!, "_blank", "noopener,noreferrer")}
                        >
                          <Facebook className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Facebook</p></TooltipContent>
                    </Tooltip>
                  )}
                  {tenant.socialLinks?.tiktok && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="rounded-full bg-zinc-800/10 text-zinc-900 dark:bg-zinc-200/10 dark:text-zinc-100 hover:bg-zinc-800/20 dark:hover:bg-zinc-200/20 border-zinc-800/20 dark:border-zinc-200/20 w-11 h-11" 
                          onClick={() => window.open(tenant.socialLinks!.tiktok!, "_blank", "noopener,noreferrer")}
                        >
                          <Music2 className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>TikTok</p></TooltipContent>
                    </Tooltip>
                  )}
                  {tenant.socialLinks?.website && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="rounded-full bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 hover:text-slate-700 border-slate-500/20 w-11 h-11" 
                          onClick={() => window.open(tenant.socialLinks!.website!, "_blank", "noopener,noreferrer")}
                        >
                          <Globe className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Site</p></TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full mt-2 h-12 text-sm font-semibold" variant="default">
                    Regulamento do Programa
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100%-2rem)] sm:w-full max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col p-5 sm:p-6 rounded-2xl gap-4">
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                      <Store className="w-5 h-5" /> Regulamento de Fidelidade
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Termos, regras de pontuação e políticas de privacidade da loja {tenant.name}.
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="regras" className="w-full mt-4 flex-1">
                    <TabsList className="grid grid-cols-4 w-full h-11 bg-muted/40 rounded-xl p-1 border border-border/30">
                      <TabsTrigger value="regras" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:shadow-sm">
                        Regras
                      </TabsTrigger>
                      <TabsTrigger value="premios" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:shadow-sm">
                        Prêmios
                      </TabsTrigger>
                      <TabsTrigger value="suporte" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:shadow-sm">
                        Suporte
                      </TabsTrigger>
                      <TabsTrigger value="privacidade" className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:shadow-sm">
                        LGPD
                      </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Regras */}
                    <TabsContent value="regras" className="space-y-4 mt-5 focus-visible:outline-none">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex flex-col items-center text-center">
                          <span className="text-2xl font-black text-primary">
                            R$ {tenant.pointsConversionReal.toFixed(2).replace(".", ",")}
                          </span>
                          <span className="text-xs text-muted-foreground mt-1 font-semibold">Equivale a 1 ponto</span>
                        </div>
                        <div className="bg-slate-500/5 border border-slate-500/10 rounded-xl p-4 flex flex-col items-center text-center">
                          <span className="text-2xl font-black text-slate-700 dark:text-slate-300">
                            {tenant.loyaltyGracePeriodDays === 0 ? "Imediata" : `${tenant.loyaltyGracePeriodDays} dias`}
                          </span>
                          <span className="text-xs text-muted-foreground mt-1 font-semibold">Carência de resgate</span>
                        </div>
                        <div className="bg-slate-500/5 border border-slate-500/10 rounded-xl p-4 flex flex-col items-center text-center">
                          <span className="text-2xl font-black text-slate-700 dark:text-slate-300">
                            {tenant.loyaltyExpirationDays === 0 ? "Sem expiração" : `${tenant.loyaltyExpirationDays} dias`}
                          </span>
                          <span className="text-xs text-muted-foreground mt-1 font-semibold">Validade dos pontos</span>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2 text-sm leading-relaxed text-muted-foreground">
                        <h4 className="font-bold text-foreground text-sm">Funcionamento Geral:</h4>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs">
                          <li>Os pontos são concedidos mediante a identificação do seu CPF no momento do pagamento no caixa.</li>
                          <li>Os pontos acumulados são de uso pessoal, intransferíveis e não podem ser convertidos em dinheiro.</li>
                          {tenant.loyaltyGracePeriodDays > 0 && (
                            <li>Após acumular pontos, eles ficarão em estado "Pendente" por {tenant.loyaltyGracePeriodDays} dias antes de ficarem "Disponíveis" para troca.</li>
                          )}
                          {tenant.loyaltyExpirationDays > 0 && (
                            <li>Fique atento: os pontos expiram automaticamente após {tenant.loyaltyExpirationDays} dias de sua data de lançamento.</li>
                          )}
                        </ul>
                      </div>

                      {tenant.regulationNotes && (
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 space-y-2 mt-2">
                          <h4 className="font-bold text-amber-700 dark:text-amber-400 text-xs flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 fill-current" /> Observações do Estabelecimento:
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                            {tenant.regulationNotes}
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Tab 2: Prêmios */}
                    <TabsContent value="premios" className="space-y-3 mt-5 focus-visible:outline-none max-h-[45vh] overflow-y-auto pr-1">
                      <h4 className="font-bold text-foreground text-sm mb-2">Recompensas do Restaurante:</h4>
                      {rewards.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">Nenhum prêmio ativo cadastrado no momento.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {rewards.map((reward) => (
                            <div key={reward.id} className="flex justify-between items-center p-3 bg-muted/20 border border-border/40 rounded-xl gap-4">
                              <div className="space-y-0.5">
                                <p className="font-bold text-xs text-foreground">{reward.name}</p>
                                {reward.description && <p className="text-[10px] text-muted-foreground line-clamp-1">{reward.description}</p>}
                              </div>
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold py-1 px-2.5 rounded-full whitespace-nowrap shrink-0">
                                {reward.pointsCost} pts
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {/* Tab 3: Suporte */}
                    <TabsContent value="suporte" className="space-y-4 mt-5 focus-visible:outline-none">
                      <div className="space-y-3">
                        <h4 className="font-bold text-foreground text-sm">Canais de Atendimento do Restaurante:</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {tenant.phone && (
                            <div className="flex items-center gap-2 p-3 bg-muted/30 border border-border/30 rounded-xl">
                              <Phone className="w-4 h-4 text-primary" />
                              <span className="font-medium text-muted-foreground">{tenant.phone}</span>
                            </div>
                          )}
                          {tenant.email && (
                            <div className="flex items-center gap-2 p-3 bg-muted/30 border border-border/30 rounded-xl">
                              <Mail className="w-4 h-4 text-primary" />
                              <span className="font-medium text-muted-foreground truncate">{tenant.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <h4 className="font-bold text-foreground text-sm">Endereço e Contato Local:</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>
                            {tenant.addressLine1 ? (
                              `${tenant.addressLine1}, nº ${tenant.addressNumber || "S/N"} - ${tenant.addressCity || ""} - ${tenant.addressState || ""}`
                            ) : (
                              "Endereço físico não informado pelo estabelecimento."
                            )}
                          </span>
                        </p>
                      </div>
                    </TabsContent>

                    {/* Tab 4: Privacidade & LGPD */}
                    <TabsContent value="privacidade" className="space-y-4 mt-5 focus-visible:outline-none text-xs leading-relaxed text-muted-foreground">
                      <div className="space-y-3">
                        <h4 className="font-bold text-foreground text-xs flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-primary" /> Como cuidamos dos seus dados pessoais:
                        </h4>
                        <p>
                          Para que o programa de fidelidade funcione, o estabelecimento **{tenant.name}** (na qualidade de Controlador de Dados) e a plataforma **Pontus** (na qualidade de Operador de Tecnologia) coletam e tratam o seu CPF, seu nome e seu histórico de compras/pontuação.
                        </p>
                        <p>
                          A base jurídica utilizada para o processamento de seus saldos e concessão de benefícios é a **Execução de Contrato (Art. 7, V da LGPD)**. Seus dados são armazenados de forma segura, criptografados no banco de dados e nunca serão comercializados.
                        </p>
                        <p>
                          Você tem o direito de solicitar a confirmação do tratamento, o acesso aos seus dados, a retificação de inconsistências ou a exclusão da sua conta a qualquer momento. Para exercer seus direitos, você pode contatar o encarregado de dados Pontus pelo canal de privacidade no portal do cliente ou falar diretamente com o estabelecimento parceiro.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Horário de Funcionamento */}
          <Card className="shadow-sm border">
            <CardHeader className="py-4 border-b">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Horários</span>
                {isOpenNow ? (
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px] uppercase">Aberto agora</Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px] uppercase">Fechado</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
              <div className="space-y-2 text-sm">
                {!tenant.businessHours ? (
                  <p className="text-muted-foreground text-center py-2">Horários não cadastrados.</p>
                ) : (
                  DAYS_ORDER.map(dayKey => {
                    const hours = tenant.businessHours![dayKey];
                    const isToday = dayKey === todayKey;
                    
                    return (
                      <div key={dayKey} className={`flex justify-between p-1.5 rounded ${isToday ? 'font-medium text-foreground bg-primary/10' : 'text-muted-foreground'}`}>
                        <span>{DAYS_MAP[dayKey]}</span>
                        {hours?.active ? (
                          <span>{hours.open} - {hours.close}</span>
                        ) : (
                          <span className="text-rose-500 text-xs mt-0.5">Fechado</span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
