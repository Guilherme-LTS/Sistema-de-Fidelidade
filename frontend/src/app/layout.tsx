import type React from "react"
import type { Metadata } from "next"
import { Inter, Plus_Jakarta_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-plus-jakarta" })

export const metadata: Metadata = {
  title: "Pontus | Fidelidade de Resultados",
  description: "A plataforma de fidelidade feita para quem tem restaurante, não para quem tem TI.",
  metadataBase: new URL("https://usepontus.com.br"),
  alternates: {
    canonical: "https://usepontus.com.br",
  },
  openGraph: {
    title: "Pontus | Fidelidade de Resultados",
    description: "A plataforma de fidelidade feita para quem tem restaurante, não para quem tem TI.",
    url: "https://usepontus.com.br",
    siteName: "Pontus",
    images: [
      {
        url: "/logo-dark.png",
        width: 1200,
        height: 630,
        alt: "Plataforma Pontus",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pontus | Fidelidade de Resultados",
    description: "A plataforma de fidelidade feita para quem tem restaurante, não para quem tem TI.",
    images: ["/logo-dark.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Pontus",
              "operatingSystem": "All",
              "applicationCategory": "BusinessApplication",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "BRL",
              },
              "description":
                "A plataforma de fidelidade feita para quem tem restaurante, não para quem tem TI.",
            }),
          }}
        />
      </head>
      <body className={`${inter.variable} ${plusJakartaSans.variable} font-sans antialiased`}>
        <ThemeProvider defaultTheme="light" storageKey="tasko-theme">
          <QueryProvider>
            {children}
          </QueryProvider>
        </ThemeProvider>
        <Toaster closeButton position="top-right" />
        <Analytics />
      </body>
    </html>
  )
}

