"use client"

// @file src/components/stats/StatsView.tsx
// @description Interactive stats view with player selector, radar + rating tabs
// @depends components/stats/StatsRadar, components/stats/RatingChart

import { useState } from "react"
import Image from "next/image"
import StatsRadar from "./StatsRadar"
import RatingChart from "./RatingChart"

// --- Types ---

export type PlayerStats = {
  userId: string
  displayName: string
  avatarUrl: string | null
  rating: number
  wins: number
  draws: number
  losses: number
  goals: number
  gamesPlayed: number
  rank: number
  ratingHistory: { date: string; rating: number }[]
}

type StatsViewProps = {
  players: PlayerStats[]
  currentUserId: string
}

type Tab = "radar" | "rating"

// --- Component ---

export default function StatsView({ players, currentUserId }: StatsViewProps) {
  const [selectedId, setSelectedId] = useState(currentUserId)
  const [tab, setTab] = useState<Tab>("radar")

  const player = players.find((p) => p.userId === selectedId) ?? players[0]
  if (!player) return null

  const initials = player.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="space-y-4">
      {/* --- Player selector (horizontal scroll) --- */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {players.map((p) => {
          const active = p.userId === selectedId
          const pInitials = p.displayName
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
          return (
            <button
              key={p.userId}
              onClick={() => setSelectedId(p.userId)}
              className={`flex flex-col items-center gap-1 shrink-0 transition-all ${
                active ? "opacity-100 scale-105" : "opacity-50 hover:opacity-75"
              }`}
            >
              <div
                className={`relative size-11 rounded-full overflow-hidden border-2 transition-colors ${
                  active ? "border-gold" : "border-transparent"
                }`}
              >
                {p.avatarUrl ? (
                  <Image
                    src={p.avatarUrl}
                    alt={p.displayName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {pInitials}
                  </div>
                )}
              </div>
              <span className="text-xs max-w-[48px] truncate">
                {p.displayName.split(" ")[0]}
              </span>
            </button>
          )
        })}
      </div>

      {/* --- Selected player header --- */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="relative size-14 rounded-full overflow-hidden border-2 border-gold shrink-0">
            {player.avatarUrl ? (
              <Image
                src={player.avatarUrl}
                alt={player.displayName}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center text-lg font-bold text-muted-foreground">
                {initials}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg truncate">{player.displayName}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="font-[family-name:var(--font-heading)] text-2xl text-gold">
                {player.rating}
              </span>
              <span className="text-sm text-muted-foreground">
                #{player.rank}
              </span>
            </div>
          </div>
          <div className="flex gap-3 text-sm text-center">
            <div>
              <p className="font-bold text-green-400">{player.wins}</p>
              <p className="text-[11px] text-muted-foreground">V</p>
            </div>
            <div>
              <p className="font-bold text-yellow-400">{player.draws}</p>
              <p className="text-[11px] text-muted-foreground">E</p>
            </div>
            <div>
              <p className="font-bold text-red-400">{player.losses}</p>
              <p className="text-[11px] text-muted-foreground">D</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- Tab switcher --- */}
      <div className="flex gap-1 p-1 rounded-lg bg-white/5">
        <button
          onClick={() => setTab("radar")}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
            tab === "radar"
              ? "bg-white/10 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Estatísticas
        </button>
        <button
          onClick={() => setTab("rating")}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
            tab === "rating"
              ? "bg-white/10 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Rating
        </button>
      </div>

      {/* --- Tab content --- */}
      <div className="glass rounded-xl p-4 pt-5">
        {tab === "radar" ? (
          <StatsRadar
            key={player.userId}
            wins={player.wins}
            draws={player.draws}
            losses={player.losses}
            goals={player.goals}
            gamesPlayed={player.gamesPlayed}
          />
        ) : (
          <RatingChart
            key={player.userId}
            history={player.ratingHistory}
            currentRating={player.rating}
          />
        )}
      </div>
    </div>
  )
}
