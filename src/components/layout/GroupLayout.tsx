"use client"

// @file src/components/layout/GroupLayout.tsx
// @description Wraps group pages with bottom nav, top header, and optional MVP vote prompt
// @depends components/layout/BottomNav, components/game/MvpVotePrompt

import { useEffect, useRef } from "react"
import { BottomNav } from "./BottomNav"
import { MvpVotePrompt } from "@/components/game/MvpVotePrompt"
import type { PendingMvpGame } from "@/components/game/MvpVotePrompt"

export function GroupLayout({
  groupSlug,
  groupName,
  pendingMvpGame,
  children,
}: {
  groupSlug: string
  groupName: string
  pendingMvpGame?: PendingMvpGame | null
  children: React.ReactNode
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    let pos = 100 // start at right (100%)

    function onScroll() {
      const scrollY = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      if (maxScroll <= 0) return

      // Map scroll position to background-position: 100% (top) → 0% (bottom)
      const pct = 100 - (scrollY / maxScroll) * 100
      pos = Math.max(0, Math.min(100, pct))

      if (titleRef.current) {
        titleRef.current.style.backgroundPosition = `${pos}% 0`
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      {/* --- Header --- */}
      <header className="sticky top-0 z-40 bg-[#0d1225] border-b border-white/10 px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <h1
            ref={titleRef}
            className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-[0.2em] text-gold-shimmer"
          >
            TINOCUP
          </h1>
        </div>
      </header>

      {/* --- Content --- */}
      <main className="flex-1 px-4 pb-20 pt-4">
        <div className="mx-auto max-w-lg">{children}</div>
      </main>

      {/* --- MVP Vote Prompt --- */}
      {pendingMvpGame && (
        <MvpVotePrompt groupSlug={groupSlug} pendingGame={pendingMvpGame} />
      )}

      {/* --- Bottom Nav --- */}
      <BottomNav groupSlug={groupSlug} />
    </div>
  )
}
