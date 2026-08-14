import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPointName(customPointName?: string | null): string {
  if (!customPointName || !customPointName.trim()) {
    return "Pontos"
  }
  return customPointName.trim()
}

