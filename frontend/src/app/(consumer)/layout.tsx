"use client"

import { ReactNode, useState } from "react"
import { ConsumerAuthProvider } from "@/features/consumer/contexts/consumer-auth-context"
import { ConsumerAuthGuard } from "@/features/consumer/components/consumer-auth-guard"
import { ConsumerUserNav } from "@/features/consumer/components/consumer-user-nav"
import { ConsumerSidebar } from "@/features/consumer/components/consumer-sidebar"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import Image from "next/image"

export default function ConsumerLayout({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <ConsumerAuthProvider>
      <ConsumerAuthGuard>
        <div className="min-h-screen bg-muted/30">
          {/* Desktop Sidebar (hidden on mobile) */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
          <ConsumerSidebar />
        </div>

        {/* Mobile Header (hidden on desktop) */}
        <header className="md:hidden sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64">
                  <SheetTitle className="sr-only">Menu Principal</SheetTitle>
                  <SheetDescription className="sr-only">Acesse seus restaurantes e perfil</SheetDescription>
                  <ConsumerSidebar onItemClick={() => setIsOpen(false)} />
                </SheetContent>
              </Sheet>
              <div className="flex flex-col ml-2">
                <Image src="/logo-light.png" alt="Pontus Logo" width={100} height={26} className="w-[90px] h-auto dark:hidden" />
                <Image src="/logo-dark.png" alt="Pontus Logo" width={100} height={26} className="w-[90px] h-auto hidden dark:block" />
              </div>
            </div>
            <div>
              <ConsumerUserNav />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="md:pl-64 flex flex-col flex-1">
          {/* Desktop header to show User Nav on right */}
          <header className="hidden md:flex h-14 items-center justify-end px-6 lg:px-8 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <ConsumerUserNav />
          </header>

          <main className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-8 py-6">
            {children}
          </main>
        </div>
      </div>
      </ConsumerAuthGuard>
    </ConsumerAuthProvider>
  )
}
