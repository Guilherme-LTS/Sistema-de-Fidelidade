import { ReactNode } from "react"
import { Lock } from "lucide-react"

interface UsageProgressProps {
  label: string
  icon: ReactNode
  current: number
  max: number | null
  isSuspended: boolean
}

export function UsageProgress({ label, icon, current, max, isSuspended }: UsageProgressProps) {
  // A. Estado Bloqueado/Suspenso (Plano expirado, cancelado ou em atraso)
  if (isSuspended || max === 0) {
    return (
      <div className="space-y-2 p-3 bg-red-50/50 dark:bg-red-950/10 rounded-lg border border-red-100 dark:border-red-900/30">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">{icon}</div>
            <span className="text-sm font-semibold text-foreground">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{current}</span>
            <div className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3" /> Bloqueado
            </div>
          </div>
        </div>
      </div>
    )
  }

  // B. Estado Ilimitado (Plano Pro)
  if (max === Infinity || max === null) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">{icon}</div>
            <span className="text-sm font-semibold text-foreground">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{current}</span>
            <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
              ∞ Ilimitado
            </div>
          </div>
        </div>
      </div>
    )
  }

  // C. Estado Limitado (Plano Pro ou Trial Ativo)
  const percentage = Math.min(100, Math.round((current / max) * 100))
  const remaining = Math.max(0, max - current)

  const isWarning = percentage >= 75 && percentage < 90
  const isDanger = percentage >= 90

  let barColorClass = "bg-primary"
  if (isDanger) barColorClass = "bg-red-500"
  else if (isWarning) barColorClass = "bg-amber-500"

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">{icon}</div>
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
          {current} / {max} <span className="font-normal opacity-70">({percentage}%)</span>
        </span>
      </div>

      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-end">
        <span className={`text-xs ${isDanger ? "text-red-500 font-medium" : isWarning ? "text-amber-500 font-medium" : "text-muted-foreground"}`}>
          {remaining > 0 ? `Restam ${remaining} disponíveis` : "Limite atingido"}
        </span>
      </div>
    </div>
  )
}
