"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pause, Square } from "lucide-react"
import { useState, useEffect } from "react"

export function TimeTracker() {
  const [seconds, setSeconds] = useState(24 * 3600 + 8)
  const [isRunning, setIsRunning] = useState(true)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const formatTime = (num: number) => String(num).padStart(2, "0")

  return (
    <Card
      className="bg-foreground text-background p-4 transition-all duration-500 hover:shadow-2xl animate-slide-in-up overflow-hidden relative group"
      style={{ animationDelay: "1000ms" }}
    >
      <div className="absolute top-0 right-0 w-48 h-full opacity-15">
        {[...Array(6)].map((_, i) => (
          <svg
            key={i}
            className="absolute"
            style={{
              top: `${i * 50}px`,
              right: `-${i * 10}px`,
              width: "150px",
              height: "80px",
            }}
            viewBox="0 0 100 50"
            preserveAspectRatio="none"
          >
            <path
              d="M0,25 Q12.5,10 25,25 T50,25 T75,25 T100,25"
              fill="none"
              stroke="oklch(0.42 0.15 155)"
              strokeWidth="2"
            />
          </svg>
        ))}
      </div>

      <div className="relative z-10">
        <h2 className="text-lg font-semibold mb-4">Time Tracker</h2>
        <div className="text-4xl sm:text-5xl font-mono font-bold mb-4 tracking-tight break-all">
          {formatTime(hours)}:{formatTime(minutes)}:{formatTime(secs)}
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsRunning(!isRunning)}
            size="icon"
            className="w-10 h-10 rounded-full bg-background text-foreground hover:bg-background/90 transition-all duration-300 hover:scale-110"
          >
            <Pause className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => {
              setSeconds(0)
              setIsRunning(false)
            }}
            size="icon"
            className="w-10 h-10 rounded-full bg-destructive hover:bg-destructive/90 transition-all duration-300 hover:scale-110"
          >
            <Square className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
