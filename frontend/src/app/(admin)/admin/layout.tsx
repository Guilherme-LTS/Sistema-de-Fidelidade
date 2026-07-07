import type { ReactNode } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { AuthProvider } from "@/lib/auth/auth-context"
import { PendingInvitations } from "@/components/dashboard/pending-invitations"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard allowedRoles={["admin", "operador", "novato"]}>
        <div className="flex min-h-screen bg-background">
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          <main className="flex-1 min-w-0 p-3 md:p-4 lg:ml-64 lg:p-5">
            <PendingInvitations />
            {children}
          </main>
        </div>
      </AuthGuard>
    </AuthProvider>
  )
}

