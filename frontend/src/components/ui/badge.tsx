import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../utils/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2",
  {
    variants: {
      variant: {
        /* Default: Dark background (neutral) */
        default:
          "border-transparent bg-stone-900 text-white hover:bg-stone-800",
        
        /* Secondary: Light background (soft) */
        secondary:
          "border-transparent bg-stone-100 text-stone-900 hover:bg-stone-200",
        
        /* Destructive: Red (error, delete) */
        destructive:
          "border-transparent bg-danger-500 text-white hover:bg-danger-600",
        
        /* Outline: Just border, no fill */
        outline: "border-stone-300 text-stone-900",
        
        /* Success: Green (positive) */
        success: "border-transparent bg-success-500 text-white hover:bg-success-600",
        
        /* Warning: Amber (attention) */
        warning: "border-transparent bg-warning-500 text-white hover:bg-warning-600",
        
        /* Info: Teal (information) — NOVO */
        info: "border-transparent bg-teal-100 text-teal-700 hover:bg-teal-200",
        
        /* Admin/Special: Teal variant */
        admin: "border-transparent bg-teal-100 text-teal-700 hover:bg-teal-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }