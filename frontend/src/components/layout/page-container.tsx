import { ReactNode } from "react"
import { Header } from "@/components/dashboard/header"

interface PageContainerProps {
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
}

export function PageContainer({ title, description, actions, children }: PageContainerProps) {
  return (
    <div className="flex flex-col gap-6 w-full mx-auto">
      <Header title={title} description={description} actions={actions} />
      {children}
    </div>
  )
}
