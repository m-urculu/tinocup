"use client"

// @file src/components/stats/StatsRadar.tsx
// @description FIFA-style animated radar/spider chart for player stats
// @depends (none — standalone SVG component)

import { useEffect, useState } from "react"
import { Info, X } from "lucide-react"

// --- Types ---

type StatsRadarProps = {
  wins: number
  draws: number
  losses: number
  goals: number
  gamesPlayed: number
}

// --- Constants ---

const AXES = [
  { key: "win", label: "VIT%", fullLabel: "Vitórias" },
  { key: "atk", label: "ATK", fullLabel: "Ataque" },
  { key: "exp", label: "EXP", fullLabel: "Experiência" },
  { key: "inv", label: "INV", fullLabel: "Invicto" },
  { key: "efi", label: "EFI", fullLabel: "Eficácia" },
] as const

const SIZE = 260
const CX = SIZE / 2
const CY = SIZE / 2
const LEVELS = 5
const MAX_R = 88
const N = AXES.length

// --- Helpers ---

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}

function getPoint(i: number, r: number) {
  const angle = (Math.PI * 2 * i) / N - Math.PI / 2
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) }
}

function toPolygon(values: number[]) {
  return values
    .map((v, i) => {
      const p = getPoint(i, v * MAX_R)
      return `${p.x},${p.y}`
    })
    .join(" ")
}

// --- Component ---

export default function StatsRadar({
  wins,
  draws,
  losses,
  goals,
  gamesPlayed,
}: StatsRadarProps) {
  const [show, setShow] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80)
    return () => clearTimeout(t)
  }, [])

  const gp = Math.max(gamesPlayed, 1)
  const decisive = Math.max(wins + losses, 1)

  // 5 practical stats normalized 0–1
  const raw = [
    clamp01(wins / gp),                          // VIT% — win rate
    clamp01((goals / gp) / 1.5),                  // ATK — goals/game (1.5 gpg = 100%)
    clamp01(gamesPlayed / 25),                    // EXP — experience (25 games = 100%)
    clamp01((wins + draws) / gp),                 // INV — unbeaten rate
    clamp01(wins / decisive),                     // EFI — wins / (wins+losses), ignoring draws
  ]

  // Display labels with real values
  const displayLabels = [
    `${Math.round((wins / gp) * 100)}%`,
    (goals / gp).toFixed(1),
    `${gamesPlayed}`,
    `${Math.round(((wins + draws) / gp) * 100)}%`,
    `${Math.round((wins / decisive) * 100)}%`,
  ]

  // Animated values (expand from 0)
  const vals = show ? raw.map((v) => Math.max(v, 0.06)) : raw.map(() => 0)

  // Overall rating number (average of all axes, 0–99 scale like FIFA)
  const overall = Math.round(
    (raw.reduce((s, v) => s + v, 0) / raw.length) * 99
  )

  const gridLevels = Array.from({ length: LEVELS }, (_, i) =>
    ((i + 1) / LEVELS) * MAX_R
  )

  return (
    <div className="relative flex flex-col items-center gap-3">
      {/* Info button */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="absolute top-0 right-0 z-10 p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
      >
        {showInfo ? <X className="size-4" /> : <Info className="size-4" />}
      </button>

      {/* Info tooltip */}
      {showInfo && (
        <div className="absolute top-7 right-0 z-20 w-56 glass rounded-lg p-3 text-xs space-y-1.5 border border-white/10">
          <p className="font-semibold text-sm mb-2">Estatísticas</p>
          <p><span className="text-foreground font-medium">VIT%</span> <span className="text-muted-foreground">— Taxa de vitória</span></p>
          <p><span className="text-foreground font-medium">ATK</span> <span className="text-muted-foreground">— Golos por jogo</span></p>
          <p><span className="text-foreground font-medium">EXP</span> <span className="text-muted-foreground">— Jogos disputados</span></p>
          <p><span className="text-foreground font-medium">INV</span> <span className="text-muted-foreground">— % de jogos sem derrota</span></p>
          <p><span className="text-foreground font-medium">EFI</span> <span className="text-muted-foreground">— Vitórias nos jogos decididos</span></p>
          <p className="text-muted-foreground pt-1 border-t border-white/5">O número central é a média geral (0–99)</p>
        </div>
      )}

      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[280px]">
        <defs>
          <linearGradient id="rf" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="rs" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <filter id="gl">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid */}
        {gridLevels.map((r, li) => (
          <polygon
            key={li}
            points={Array.from({ length: N }, (_, i) => {
              const p = getPoint(i, r)
              return `${p.x},${p.y}`
            }).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={li === LEVELS - 1 ? 0.8 : 0.4}
          />
        ))}

        {/* Axis spokes */}
        {Array.from({ length: N }, (_, i) => {
          const p = getPoint(i, MAX_R)
          return (
            <line
              key={i}
              x1={CX} y1={CY} x2={p.x} y2={p.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={0.4}
            />
          )
        })}

        {/* Data shape */}
        <polygon
          points={toPolygon(vals)}
          fill="url(#rf)"
          stroke="url(#rs)"
          strokeWidth={2}
          filter="url(#gl)"
          className="transition-all duration-[1200ms] ease-out"
        />

        {/* Vertex dots */}
        {vals.map((v, i) => {
          const p = getPoint(i, v * MAX_R)
          return (
            <circle
              key={i}
              cx={p.x} cy={p.y} r={2.5}
              fill="white"
              className="transition-all duration-[1200ms] ease-out"
              style={{ filter: "drop-shadow(0 0 3px rgba(255,255,255,0.5))" }}
            />
          )
        })}

        {/* Overall rating in center */}
        <text
          x={CX} y={CY - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground"
          style={{ fontSize: "34px", fontWeight: 800, fontFamily: "var(--font-heading)" }}
        >
          {gamesPlayed > 0 ? overall : "—"}
        </text>
        <text
          x={CX} y={CY + 14}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground"
          style={{ fontSize: "9px", letterSpacing: "0.15em" }}
        >
          OVERALL
        </text>

        {/* Axis labels + values */}
        {AXES.map((axis, i) => {
          const p = getPoint(i, MAX_R + 28)
          return (
            <g key={axis.key}>
              <text
                x={p.x} y={p.y - 6}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground"
                style={{ fontSize: "9px", letterSpacing: "0.08em" }}
              >
                {axis.label}
              </text>
              <text
                x={p.x} y={p.y + 6}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground"
                style={{ fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-heading)" }}
              >
                {gamesPlayed > 0 ? displayLabels[i] : "—"}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend row under the chart */}
      <div className="grid grid-cols-5 gap-1 w-full text-center px-2">
        {AXES.map((axis, i) => (
          <div key={axis.key} className="space-y-0.5">
            <p className="text-xs text-muted-foreground leading-tight">{axis.fullLabel}</p>
          </div>
        ))}
      </div>

      {/* W/D/L summary row */}
      <div className="flex items-center justify-center gap-4 text-sm">
        <span className="text-green-400 font-bold">{wins}V</span>
        <span className="text-yellow-400 font-bold">{draws}E</span>
        <span className="text-red-400 font-bold">{losses}D</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-electric font-bold">{goals} golos</span>
      </div>
    </div>
  )
}
