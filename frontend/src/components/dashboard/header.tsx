"use client"

import type { ReactNode } from "react"

interface HeaderProps {
  title: string
  description: string
  actions?: ReactNode
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <div className="space-y-3 md:space-y-4 animate-slide-in-up pb-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1">{title}</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{description}</p>
        </div>

        {actions && <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">{actions}</div>}
      </div>
    </div>
  )
}
