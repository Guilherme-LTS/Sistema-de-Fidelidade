import { ReactNode } from "react"
import { AuthProvider } from "@/lib/auth/auth-context"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}
