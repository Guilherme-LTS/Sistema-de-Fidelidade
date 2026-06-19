"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Smartphone, Apple } from "lucide-react"

export function MobileAppCard() {
  return (
    <Card
      className="bg-foreground text-background p-4 transition-all duration-500 hover:shadow-2xl animate-slide-in-up overflow-hidden relative group"
      style={{ animationDelay: "900ms" }}
    >
      <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden">
        <svg
          className="absolute bottom-0 w-full"
          viewBox="0 0 200 60"
          preserveAspectRatio="none"
          style={{ height: "100px" }}
        >
          <path
            d="M0,30 Q25,15 50,30 T100,30 T150,30 T200,30 L200,60 L0,60 Z"
            fill="oklch(0.42 0.15 155)"
            opacity="0.3"
          />
          <path d="M0,40 Q25,25 50,40 T100,40 T150,40 T200,40 L200,60 L0,60 Z" fill="oklch(0.42 0.15 155)" />
        </svg>
      </div>

      <div className="relative z-10">
        <Smartphone className="w-6 h-6 mb-3" />
        <h2 className="text-xl font-bold mb-1">Download our Mobile App</h2>
        <p className="text-xs opacity-80 mb-4">Get easy in another way</p>

        <div className="flex flex-col gap-2 mb-4">
          <Button
            variant="secondary"
            className="w-full h-10 bg-background text-foreground hover:bg-background/90 transition-all duration-300 hover:scale-105 flex items-center justify-start gap-2 px-3"
          >
            <Apple className="w-5 h-5" />
            <div className="flex flex-col items-start text-left">
              <span className="text-[10px] leading-none">Download on the</span>
              <span className="text-sm font-semibold leading-none">App Store</span>
            </div>
          </Button>

          <Button
            variant="secondary"
            className="w-full h-10 bg-background text-foreground hover:bg-background/90 transition-all duration-300 hover:scale-105 flex items-center justify-start gap-2 px-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
            </svg>
            <div className="flex flex-col items-start text-left">
              <span className="text-[10px] leading-none">Get it on</span>
              <span className="text-sm font-semibold leading-none">Google Play</span>
            </div>
          </Button>
        </div>
      </div>
    </Card>
  )
}
