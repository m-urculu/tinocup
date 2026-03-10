"use client"

// @file src/components/game/ScorePanel.tsx
// @description Score recording panel — validates goalscorer totals match team scores
// @depends app/group/[slug]/games/[gameId]/actions

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { submitScoreAction } from "@/app/group/[slug]/games/[gameId]/actions"

// --- Types ---

type TeamMember = {
  id: string
  user_id: string
  team: string
  profile: { display_name: string } | null
}

// --- Component ---

export function ScorePanel({
  gameId,
  groupSlug,
  homeTeam,
  awayTeam,
}: {
  gameId: string
  groupSlug: string
  homeTeam: TeamMember[]
  awayTeam: TeamMember[]
}) {
  const [scoreHome, setScoreHome] = useState(0)
  const [scoreAway, setScoreAway] = useState(0)
  const [goals, setGoals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const homeIds = new Set(homeTeam.map((p) => p.user_id))
  const homeGoals = Object.entries(goals)
    .filter(([id]) => homeIds.has(id))
    .reduce((sum, [, c]) => sum + c, 0)
  const awayGoals = Object.entries(goals)
    .filter(([id]) => !homeIds.has(id))
    .reduce((sum, [, c]) => sum + c, 0)

  const homeMatch = homeGoals === scoreHome
  const awayMatch = awayGoals === scoreAway
  const totalScore = scoreHome + scoreAway

  function updateGoals(userId: string, count: number) {
    setGoals((prev) => ({ ...prev, [userId]: Math.max(0, count) }))
  }

  async function handleSubmitScore() {
    if (totalScore > 0 && (!homeMatch || !awayMatch)) {
      toast.error("O total de golos deve corresponder ao resultado")
      return
    }

    setLoading(true)
    const result = await submitScoreAction(gameId, groupSlug, scoreHome, scoreAway, goals)

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    setLoading(false)
    toast.success("Jogo concluído!")
    router.refresh()
  }

  function renderTeamGoals(team: TeamMember[], label: string, teamScore: number, teamGoals: number, color: string) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-xs font-medium ${color}`}>{label}</p>
          <p className={`text-xs ${teamGoals === teamScore ? "text-green-400" : "text-red-400"}`}>
            {teamGoals}/{teamScore} golos
          </p>
        </div>
        <div className="space-y-1.5">
          {team.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5"
            >
              <span className="text-sm truncate mr-2">
                {player.profile?.display_name ?? "Unknown"}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => updateGoals(player.user_id, (goals[player.user_id] ?? 0) - 1)}
                  className="size-6 rounded glass text-xs font-bold"
                >
                  −
                </button>
                <Input
                  type="number"
                  min={0}
                  value={goals[player.user_id] ?? 0}
                  onChange={(e) => updateGoals(player.user_id, parseInt(e.target.value) || 0)}
                  className="w-10 h-7 text-center bg-transparent border-white/10 text-sm p-0"
                />
                <button
                  onClick={() => updateGoals(player.user_id, (goals[player.user_id] ?? 0) + 1)}
                  className="size-6 rounded glass text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold">Registar Resultado</h3>

      {/* --- Score Input --- */}
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-xs text-electric mb-1">Casa</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScoreHome(Math.max(0, scoreHome - 1))}
              className="size-8 rounded-lg glass text-lg font-bold"
            >
              −
            </button>
            <span className="font-[family-name:var(--font-heading)] text-4xl w-12 text-center">
              {scoreHome}
            </span>
            <button
              onClick={() => setScoreHome(scoreHome + 1)}
              className="size-8 rounded-lg glass text-lg font-bold"
            >
              +
            </button>
          </div>
        </div>
        <span className="text-2xl text-muted-foreground mt-4">-</span>
        <div className="text-center">
          <p className="text-xs text-gold mb-1">Fora</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScoreAway(Math.max(0, scoreAway - 1))}
              className="size-8 rounded-lg glass text-lg font-bold"
            >
              −
            </button>
            <span className="font-[family-name:var(--font-heading)] text-4xl w-12 text-center">
              {scoreAway}
            </span>
            <button
              onClick={() => setScoreAway(scoreAway + 1)}
              className="size-8 rounded-lg glass text-lg font-bold"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* --- Goalscorers --- */}
      {totalScore > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Atribuir golos aos jogadores
          </p>
          {scoreHome > 0 && renderTeamGoals(homeTeam, "Casa", scoreHome, homeGoals, "text-electric")}
          {scoreAway > 0 && renderTeamGoals(awayTeam, "Fora", scoreAway, awayGoals, "text-gold")}
        </div>
      )}

      <Button
        onClick={handleSubmitScore}
        disabled={loading || (totalScore > 0 && (!homeMatch || !awayMatch))}
        className="w-full h-11 gradient-gold text-black font-bold hover:opacity-90 transition-opacity"
      >
        {loading ? "A guardar..." : "Submeter Resultado"}
      </Button>
    </div>
  )
}
