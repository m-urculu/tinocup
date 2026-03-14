"use client"

// @file src/components/stats/StatsRadar.tsx
// @description FIFA-style animated radar/spider chart for player stats
// @depends (none — standalone SVG component)

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Info, X } from "lucide-react"

// --- Types ---

type GroupMax = {
  games: number
  rating: number
  goalsRate: number
}

type StatsRadarProps = {
  wins: number
  draws: number
  losses: number
  goals: number
  gamesPlayed: number
  rating: number
  groupMax: GroupMax
  mvpCount: number
}

// --- Constants ---

const AXES = [
  { key: "vit", label: "VIT", fullLabel: "Vitórias" },
  { key: "gol", label: "GOL", fullLabel: "Golos/Jogo" },
  { key: "pre", label: "PRE", fullLabel: "Presença" },
  { key: "mvp", label: "MVP", fullLabel: "MVP/Jogo" },
  { key: "pdr", label: "PDR", fullLabel: "Puta de Rei" },
] as const

// Absolute ceilings — the value at which an axis reaches 100%
const GOL_CEILING = 5.0   // 5 goals/game = full axis
const MVP_CEILING = 0.5   // MVP in 50% of games = full axis

// Bayesian prior — assume average until proven otherwise
// Everyone starts at AVG_PRIOR and converges to real rate over PRIOR_K games
const AVG_PRIOR = 0.3     // "average" baseline on 0–1 scale
const PRIOR_K = 3          // games needed for real rate to have 50% weight

const SIZE = 280
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

function toPath(values: number[]) {
  return values
    .map((v, i) => {
      const p = getPoint(i, v * MAX_R)
      return `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`
    })
    .join(" ") + " Z"
}

// --- Component ---

export default function StatsRadar({
  wins,
  draws,
  losses,
  goals,
  gamesPlayed,
  rating,
  groupMax,
  mvpCount,
}: StatsRadarProps) {
  const [show, setShow] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80)
    return () => clearTimeout(t)
  }, [])

  const gp = Math.max(gamesPlayed, 1)

  // Per-game rates
  const winRate = wins / gp
  const goalsRate = goals / gp
  const mvpRate = mvpCount / gp

  // Bayesian adjustment: start at AVG_PRIOR, converge to real rate with more games
  // 1 game: ~83% prior, 5 games: 50/50, 10 games: ~67% real, 20 games: ~80% real
  const bayesian = (rawNorm: number) =>
    (AVG_PRIOR * PRIOR_K + rawNorm * gamesPlayed) / (PRIOR_K + gamesPlayed)

  // 4 independent axes — rate axes use Bayesian adjustment, PRE is raw
  const vitNorm = bayesian(clamp01(winRate))
  const golNorm = clamp01(groupMax.goalsRate > 0 ? goalsRate / groupMax.goalsRate : 0) // relative to top scorer
  const preNorm = clamp01(groupMax.games > 0 ? gamesPlayed / groupMax.games : 0) // relative to most present
  const mvpNorm = bayesian(clamp01(mvpRate / MVP_CEILING))

  // ELO normalized against group best (already Bayesian-like — starts at 1000, moves slowly)
  const eloNorm = clamp01(groupMax.rating > 0 ? rating / groupMax.rating : 0)

  // PDR composite: 25% VIT + 20% GOL + 15% MVP + 15% PRE + 25% ELO
  const pdrNorm = vitNorm * 0.25 + golNorm * 0.20 + mvpNorm * 0.15 + preNorm * 0.15 + eloNorm * 0.25

  const raw = [vitNorm, golNorm, preNorm, mvpNorm, pdrNorm]

  // Display labels with real values
  const pdrScore = Math.min(99, Math.round(pdrNorm * 99))
  const displayLabels = [
    `${Math.round(winRate * 100)}%`,
    goalsRate.toFixed(1),
    `${gamesPlayed}`,
    `${mvpCount}`,
    `${pdrScore}`,
  ]

  // Animated values (expand from 0)
  const vals = show ? raw.map((v) => Math.max(v, 0.06)) : raw.map(() => 0)

  // Overall = weighted avg of 4 independent axes (PDR excluded to avoid double-counting)
  // Weights: VIT×2, GOL×2, PRE×1, MVP×1 → total 6
  const indepAxes = [vitNorm, golNorm, preNorm, mvpNorm]
  const weights = [2, 2, 1, 1]
  const totalWeight = weights.reduce((s, w) => s + w, 0)
  const weightedSum = indepAxes.reduce((s, v, i) => s + v * weights[i], 0)
  const overall = Math.min(99, Math.round((weightedSum / totalWeight) * 99))

  const gridLevels = Array.from({ length: LEVELS }, (_, i) =>
    ((i + 1) / LEVELS) * MAX_R
  )

  if (showInfo) {
    return (
      <div className="relative space-y-4 py-2">
        <button
          onClick={() => setShowInfo(false)}
          className="absolute top-2 right-0 p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-5" />
        </button>

        <p className="font-semibold text-base">Como funcionam as estatísticas</p>

        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-foreground">VIT — Vitórias</p>
            <p className="text-muted-foreground font-mono text-xs mt-0.5">(0.9 + vitórias) ÷ (3 + jogos)</p>
            <p className="text-muted-foreground mt-1">Ganhar é o que importa. Mede a tua capacidade de arrastar a equipa para a vitória, jogo após jogo. Com poucos jogos o sistema assume que és médio — prova o contrário.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">GOL — Golos/Jogo</p>
            <p className="text-muted-foreground font-mono text-xs mt-0.5">teus golos/jogo ÷ melhor golos/jogo do grupo</p>
            <p className="text-muted-foreground mt-1">O instinto de finalizador. Não basta jogar bonito — a bola tem de entrar. O melhor marcador do grupo é a referência e tem o eixo cheio.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">PRE — Presença</p>
            <p className="text-muted-foreground font-mono text-xs mt-0.5">teus jogos ÷ máx. jogos do grupo</p>
            <p className="text-muted-foreground mt-1">Aparecer já é metade da batalha. Mede a tua dedicação ao grupo — quem aparece sempre está no topo. O jogador mais assíduo tem o eixo cheio.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">MVP — MVP/Jogo</p>
            <p className="text-muted-foreground font-mono text-xs mt-0.5">(0.9 + MVPs×2) ÷ (3 + jogos)</p>
            <p className="text-muted-foreground mt-1">O reconhecimento dos teus companheiros. Ser MVP não se compra — ganha-se em campo. Mede quantas vezes foste o melhor em relação ao total de jogos.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">PDR — Puta de Rei</p>
            <p className="text-muted-foreground font-mono text-xs mt-0.5">25%VIT + 20%GOL + 15%MVP + 15%PRE + 25%×(ELO ÷ melhor ELO)</p>
            <p className="text-muted-foreground mt-1">O selo de rei. Não basta ser bom numa coisa — o PDR exige tudo: ganhar, marcar, aparecer, ser votado e ter um rating forte. O jogador mais completo domina este eixo.</p>
          </div>
        </div>

        <div className="border-t border-white/5 pt-3 text-sm text-muted-foreground">
          <p className="font-mono text-xs">Overall = (VIT×2 + GOL×2 + PRE + MVP) ÷ 6 × 99</p>
          <p className="mt-1">O número no centro. Vitórias e golos pesam o dobro — porque no fim do dia, o futebol decide-se com bola na rede e braços no ar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center gap-3">
      {/* Info button */}
      <button
        onClick={() => setShowInfo(true)}
        className="absolute top-0 right-0 p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="size-5" />
      </button>

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
        <motion.path
          initial={{ d: toPath(raw.map(() => 0)) }}
          animate={{ d: toPath(vals) }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          fill="url(#rf)"
          stroke="url(#rs)"
          strokeWidth={2}
          filter="url(#gl)"
        />

        {/* Vertex dots */}
        {vals.map((v, i) => {
          const target = getPoint(i, v * MAX_R)
          return (
            <motion.circle
              key={i}
              initial={{ cx: CX, cy: CY }}
              animate={{ cx: target.x, cy: target.y }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              r={2.5}
              fill="white"
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
          const p = getPoint(i, MAX_R + 32)
          return (
            <g key={axis.key}>
              <text
                x={p.x} y={p.y - 7}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground"
                style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em" }}
              >
                {axis.label}
              </text>
              <text
                x={p.x} y={p.y + 8}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground"
                style={{ fontSize: "15px", fontWeight: 700, fontFamily: "var(--font-heading)" }}
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
        <span className="text-muted-foreground">·</span>
        <span className="text-gold font-bold">{mvpCount} MVP</span>
      </div>
    </div>
  )
}
