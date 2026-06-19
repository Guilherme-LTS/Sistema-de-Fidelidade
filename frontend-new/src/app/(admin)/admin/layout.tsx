import type { ReactNode } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { AuthGuard } from "@/features/auth/components/auth-guard"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireAdmin>
      <div className="flex min-h-screen bg-background">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        <main className="flex-1 p-3 md:p-4 lg:ml-64 lg:p-5">{children}</main>
      </div>
    </AuthGuard>
  )
}

