"use client"

// @file src/components/layout/BottomNav.tsx
// @description Bottom navigation bar — mobile-first, FIFA-styled with gold active state
// @depends lucide-react

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Gamepad2, BarChart3, CreditCard, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Início", icon: Home, path: "" },
  { label: "Jogos", icon: Gamepad2, path: "/games" },
  { label: "Stats", icon: BarChart3, path: "/stats" },
  { label: "Pagam.", icon: CreditCard, path: "/payments" },
  { label: "Config.", icon: Settings, path: "/settings" },
]

export function BottomNav({ groupId }: { groupId: string }) {
  const pathname = usePathname()
  const basePath = `/group/${groupId}`

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d1225] border-t border-white/10">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {navItems.map((item) => {
          const fullPath = `${basePath}${item.path}`
          const isActive =
            item.path === ""
              ? pathname === basePath
              : pathname.startsWith(fullPath)
          const Icon = item.icon

          return (
            <Link
              key={item.label}
              href={fullPath}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all",
                isActive
                  ? "text-gold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("size-5", isActive && "drop-shadow-[0_0_6px_rgba(212,175,55,0.5)]")} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
