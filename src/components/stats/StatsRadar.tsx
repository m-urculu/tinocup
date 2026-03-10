"use client"

// @file src/components/stats/StatsRadar.tsx
// @description FIFA-style animated radar/spider chart for player stats

import { useEffect, useState } from "react"

// --- Types ---

type StatsRadarProps = {
  rating: number
  wins: number
  draws: number
  losses: number
  goals: number
  gamesPlayed: number
}

// --- Constants ---

const LABELS = ["RAT", "VIT", "GOL", "JGS", "EMP", "DEF"]
const SIZE = 240
const CX = SIZE / 2
const CY = SIZE / 2
const LEVELS = 5
const MAX_R = 90

// --- Helpers ---

/** Convert a stat to 0–1 scale */
function normalize(value: number, max: number) {
  return Math.min(value / max, 1)
}

/** Get polygon point for index i at given radius */
function getPoint(i: number, r: number, total: number) {
  const angle = (Math.PI * 2 * i) / total - Math.PI / 2
  return {
    x: CX + r * Math.cos(angle),
    y: CY + r * Math.sin(angle),
  }
}

/** Build SVG polygon points string */
function polygonPoints(values: number[]) {
  return values
    .map((v, i) => {
      const p = getPoint(i, v * MAX_R, values.length)
      return `${p.x},${p.y}`
    })
    .join(" ")
}

// --- Component ---

export default function StatsRadar({
  rating,
  wins,
  draws,
  losses,
  goals,
  gamesPlayed,
}: StatsRadarProps) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Normalize stats to 0–1 (with sensible FIFA-like maxes)
  const values = [
    normalize(rating, 1200),       // RAT — max ~1200
    normalize(wins, Math.max(gamesPlayed, 1)),  // VIT — win rate
    normalize(goals, Math.max(gamesPlayed * 1.5, 1)), // GOL — goals relative to games
    normalize(gamesPlayed, 30),    // JGS — experience, max 30
    normalize(draws, Math.max(gamesPlayed, 1)),  // EMP — draw rate
    normalize(1 - (losses / Math.max(gamesPlayed, 1)), 1), // DEF — defensive (inverse loss rate)
  ]

  // Ensure minimum visibility
  const displayValues = animated
    ? values.map((v) => Math.max(v, 0.08))
    : values.map(() => 0)

  const n = LABELS.length

  // Grid levels
  const gridLevels = Array.from({ length: LEVELS }, (_, i) =>
    ((i + 1) / LEVELS) * MAX_R
  )

  // Stat value labels (actual numbers)
  const statValues = [
    rating.toString(),
    `${gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0}%`,
    goals.toString(),
    gamesPlayed.toString(),
    draws.toString(),
    `${gamesPlayed > 0 ? Math.round(((gamesPlayed - losses) / gamesPlayed) * 100) : 0}%`,
  ]

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[280px]"
        style={{ filter: "drop-shadow(0 0 20px rgba(59, 130, 246, 0.15))" }}
      >
        <defs>
          {/* Gradient fill for the stat polygon */}
          <linearGradient id="radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.35" />
            <stop offset="50%" stopColor="rgb(59, 130, 246)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="rgb(168, 85, 247)" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="radar-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(34, 197, 94)" />
            <stop offset="50%" stopColor="rgb(59, 130, 246)" />
            <stop offset="100%" stopColor="rgb(168, 85, 247)" />
          </linearGradient>
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background grid — hexagonal levels */}
        {gridLevels.map((r, li) => (
          <polygon
            key={li}
            points={Array.from({ length: n }, (_, i) => {
              const p = getPoint(i, r, n)
              return `${p.x},${p.y}`
            }).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={li === LEVELS - 1 ? 1 : 0.5}
          />
        ))}

        {/* Axis lines from center to each vertex */}
        {Array.from({ length: n }, (_, i) => {
          const p = getPoint(i, MAX_R, n)
          return (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={0.5}
            />
          )
        })}

        {/* Stat polygon — the main shape */}
        <polygon
          points={polygonPoints(displayValues)}
          fill="url(#radar-fill)"
          stroke="url(#radar-stroke)"
          strokeWidth={2}
          filter="url(#glow)"
          className="transition-all duration-1000 ease-out"
        />

        {/* Vertex dots */}
        {displayValues.map((v, i) => {
          const p = getPoint(i, v * MAX_R, n)
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3}
              fill="white"
              className="transition-all duration-1000 ease-out"
              style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.6))" }}
            />
          )
        })}

        {/* Labels around the chart */}
        {LABELS.map((label, i) => {
          const p = getPoint(i, MAX_R + 22, n)
          return (
            <g key={i}>
              <text
                x={p.x}
                y={p.y - 6}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground"
                style={{ fontSize: "8px", letterSpacing: "0.05em" }}
              >
                {label}
              </text>
              <text
                x={p.x}
                y={p.y + 6}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground"
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  fontFamily: "var(--font-heading)",
                }}
              >
                {statValues[i]}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
