import { redirect } from "next/navigation"
import { routes } from "@/config/routes"

export default function AdminIndexPage() {
  redirect(routes.admin.dashboard)
}
