import type { Metadata } from "next"
import { ReactNode } from "react"
import { ConsumerClientLayout } from "./consumer-client-layout"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function ConsumerLayout({ children }: { children: ReactNode }) {
  return <ConsumerClientLayout>{children}</ConsumerClientLayout>
}
