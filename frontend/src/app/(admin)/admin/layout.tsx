import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { AuthGuard } from "@/features/auth/components/auth-guard"
import { AuthProvider } from "@/lib/auth/auth-context"
import { PendingInvitations } from "@/components/dashboard/pending-invitations"
import { BillingBanner } from "@/components/dashboard/billing-banner"
import { AdminHeader } from "@/components/dashboard/admin-header"
import { TrialOnboardingModal } from "@/features/configuracoes/components/trial-onboarding-modal"
import { Footer } from "@/components/layout/footer"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard allowedRoles={["admin", "operador", "novato"]}>
        <div className="flex min-h-screen bg-background">
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          <main className="flex-1 min-w-0 lg:ml-64 flex flex-col">
            <AdminHeader />
            <div className="flex-1 p-3 md:p-4 lg:p-5">
              <PendingInvitations />
              <BillingBanner />
              <TrialOnboardingModal />
              {children}
            </div>
            <Footer />
          </main>
        </div>
      </AuthGuard>
    </AuthProvider>
  )
}

