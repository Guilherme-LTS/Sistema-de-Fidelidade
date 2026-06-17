import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../utils/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        /* Primary: Teal — Ação principal (CTA) */
        default: "bg-teal-500 text-white hover:bg-teal-700 shadow-sm hover:shadow-md",
        
        /* Destructive: Red — Deletar, rejeitar */
        destructive: "bg-danger-500 text-white hover:bg-danger-600 shadow-sm hover:shadow-md",
        
        /* Outline: White with teal border — Ação secundária */
        outline: "border border-stone-300 bg-stone-50 text-teal-500 hover:bg-stone-100 hover:text-teal-700",
        
        /* Secondary: Soft teal background — Ação terciária */
        secondary: "bg-teal-50 text-teal-700 hover:bg-teal-100 shadow-xs hover:shadow-sm",
        
        /* Ghost: Transparent — Links dentro de contexto */
        ghost: "hover:bg-stone-100 hover:text-stone-900 text-stone-700",
        
        /* Link: Text with underline — Links simples */
        link: "text-teal-500 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }