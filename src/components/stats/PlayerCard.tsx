// @file src/components/stats/PlayerCard.tsx
// @description FUT-style player card with avatar, rating, stats, and rank

import { cn } from "@/lib/utils"
import Image from "next/image"

export function PlayerCardComponent({
  rank,
  rating,
  displayName,
  avatarUrl,
  gamesPlayed,
  wins,
  draws,
  losses,
  goals,
}: {
  rank: number
  rating: number
  displayName: string
  avatarUrl?: string | null
  gamesPlayed: number
  wins: number
  draws: number
  losses: number
  goals: number
}) {
  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0

  const isTop3 = rank <= 3
  const borderColor = rank === 1
    ? "border-gold glow-gold"
    : rank === 2
      ? "border-gray-400"
      : rank === 3
        ? "border-amber-700"
        : "border-white/10"

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className={cn(
        "glass rounded-xl p-3 border transition-all hover:scale-[1.02]",
        borderColor
      )}
    >
      {/* --- Rank + Rating --- */}
      <div className="flex items-start justify-between mb-2">
        <span
          className={cn(
            "font-[family-name:var(--font-heading)] text-4xl leading-none",
            isTop3 ? "text-gold" : "text-foreground"
          )}
        >
          {rating}
        </span>
        <span
          className={cn(
            "text-xs font-bold px-1.5 py-0.5 rounded",
            rank === 1
              ? "bg-gold text-black"
              : rank === 2
                ? "bg-gray-400 text-black"
                : rank === 3
                  ? "bg-amber-700 text-white"
                  : "bg-white/10 text-muted-foreground"
          )}
        >
          #{rank}
        </span>
      </div>

      {/* --- Avatar + Name --- */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative size-7 rounded-full overflow-hidden shrink-0">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center text-xs font-bold text-muted-foreground">
              {initials}
            </div>
          )}
        </div>
        <p className="text-base font-semibold truncate">{displayName}</p>
      </div>

      {/* --- Stats Grid --- */}
      <div className="grid grid-cols-3 gap-1 text-center">
        <div>
          <p className="font-[family-name:var(--font-heading)] text-base text-electric">
            {winRate}%
          </p>
          <p className="text-[11px] text-muted-foreground">VIT</p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-heading)] text-base text-gold">
            {goals}
          </p>
          <p className="text-[11px] text-muted-foreground">GOL</p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-heading)] text-base text-foreground">
            {gamesPlayed}
          </p>
          <p className="text-[11px] text-muted-foreground">JG</p>
        </div>
      </div>

      {/* --- W/D/L Bar --- */}
      {gamesPlayed > 0 && (
        <div className="flex h-1 rounded-full overflow-hidden mt-2">
          {wins > 0 && (
            <div
              className="bg-green-500"
              style={{ width: `${(wins / gamesPlayed) * 100}%` }}
            />
          )}
          {draws > 0 && (
            <div
              className="bg-yellow-500"
              style={{ width: `${(draws / gamesPlayed) * 100}%` }}
            />
          )}
          {losses > 0 && (
            <div
              className="bg-red-500"
              style={{ width: `${(losses / gamesPlayed) * 100}%` }}
            />
          )}
        </div>
      )}
    </div>
  )
}
