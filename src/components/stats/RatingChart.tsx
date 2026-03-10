"use client"

// @file src/components/stats/RatingChart.tsx
// @description SVG line chart showing rating progression over time
// @depends (none — standalone SVG component)

import { useEffect, useState } from "react"

// --- Types ---

type RatingChartProps = {
  history: { date: string; rating: number }[]
  currentRating: number
}

// --- Constants ---

const W = 300
const H = 160
const PAD_X = 36
const PAD_Y = 24
const PAD_BOTTOM = 28

// --- Component ---

export default function RatingChart({ history, currentRating }: RatingChartProps) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80)
    return () => clearTimeout(t)
  }, [])

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-base">Sem dados de rating</p>
        <p className="text-sm mt-1">Joga partidas para ver a evolução</p>
      </div>
    )
  }

  // Add starting point at 1000 if first entry isn't there
  const data = history[0]?.rating === 1000
    ? history
    : [{ date: history[0].date, rating: 1000 }, ...history]

  const ratings = data.map((d) => d.rating)
  const minR = Math.min(...ratings) - 20
  const maxR = Math.max(...ratings) + 20
  const rangeR = maxR - minR || 1

  const chartW = W - PAD_X * 2
  const chartH = H - PAD_Y - PAD_BOTTOM

  function toX(i: number) {
    return PAD_X + (i / Math.max(data.length - 1, 1)) * chartW
  }
  function toY(r: number) {
    return PAD_Y + chartH - ((r - minR) / rangeR) * chartH
  }

  // Build path
  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d.rating)}`)
    .join(" ")

  // Area fill path
  const areaPath = `${linePath} L ${toX(data.length - 1)} ${toY(minR)} L ${toX(0)} ${toY(minR)} Z`

  // Horizontal grid lines (4 levels)
  const gridCount = 4
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const r = minR + (rangeR * i) / gridCount
    return { y: toY(r), label: Math.round(r) }
  })

  // Date labels (first, middle, last)
  const dateLabels: { x: number; label: string }[] = []
  const fmt = (d: string) => {
    const dt = new Date(d)
    return dt.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })
  }
  if (data.length >= 1) dateLabels.push({ x: toX(0), label: fmt(data[0].date) })
  if (data.length >= 3) dateLabels.push({ x: toX(Math.floor(data.length / 2)), label: fmt(data[Math.floor(data.length / 2)].date) })
  if (data.length >= 2) dateLabels.push({ x: toX(data.length - 1), label: fmt(data[data.length - 1].date) })

  // Last point
  const lastX = toX(data.length - 1)
  const lastY = toY(data[data.length - 1].rating)

  // Change from start
  const ratingChange = currentRating - 1000
  const changeColor = ratingChange > 0 ? "#22c55e" : ratingChange < 0 ? "#ef4444" : "#888"
  const changeText = ratingChange > 0 ? `+${ratingChange}` : `${ratingChange}`

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full transition-opacity duration-500 ${show ? "opacity-100" : "opacity-0"}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <linearGradient id="area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <filter id="dot-glow">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={PAD_X} y1={g.y} x2={W - PAD_X} y2={g.y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={0.5}
            />
            <text
              x={PAD_X - 4} y={g.y}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground"
              style={{ fontSize: "9px" }}
            >
              {g.label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#area-grad)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#line-grad)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={toX(i)}
            cy={toY(d.rating)}
            r={i === data.length - 1 ? 3.5 : 1.5}
            fill={i === data.length - 1 ? "#22c55e" : "rgba(255,255,255,0.4)"}
            filter={i === data.length - 1 ? "url(#dot-glow)" : undefined}
          />
        ))}

        {/* Current rating label at last point */}
        <text
          x={lastX}
          y={lastY - 10}
          textAnchor="middle"
          className="fill-foreground"
          style={{ fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-heading)" }}
        >
          {currentRating}
        </text>

        {/* Date labels */}
        {dateLabels.map((dl, i) => (
          <text
            key={i}
            x={dl.x}
            y={H - 6}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: "9px" }}
          >
            {dl.label}
          </text>
        ))}
      </svg>

      {/* Change indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Desde o início:</span>
        <span className="font-bold" style={{ color: changeColor }}>
          {changeText}
        </span>
      </div>
    </div>
  )
}
