// @file src/app/group/[id]/stats/page.tsx
// @description Stats page — player selector, radar chart, rating history
// @depends lib/supabase/server, components/stats/StatsView

import { createClient } from "@/lib/supabase/server"
import StatsView from "@/components/stats/StatsView"
import type { PlayerStats, GroupMax } from "@/components/stats/StatsView"

export default async function StatsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch all player ratings with profiles
  const { data: ratings } = await supabase
    .from("player_ratings")
    .select("*, profile:profiles(display_name, avatar_url)")
    .eq("group_id", id)
    .order("rating", { ascending: false })

  // Fetch completed games + teams to build rating history per player
  const { data: completedGames } = await supabase
    .from("games")
    .select("id, date, score_home, score_away")
    .eq("group_id", id)
    .eq("status", "completed")
    .order("date", { ascending: true })

  // Fetch teams for all completed games
  const gameIds = (completedGames ?? []).map((g) => g.id)
  let teamsMap: Record<string, { user_id: string; team: string }[]> = {}
  if (gameIds.length > 0) {
    const { data: teams } = await supabase
      .from("game_teams")
      .select("game_id, user_id, team")
      .in("game_id", gameIds)
    if (teams) {
      for (const t of teams) {
        if (!teamsMap[t.game_id]) teamsMap[t.game_id] = []
        teamsMap[t.game_id].push(t)
      }
    }
  }

  // Fetch goals per game per player
  let goalsMap: Record<string, Record<string, number>> = {} // gameId -> userId -> count
  if (gameIds.length > 0) {
    const { data: goals } = await supabase
      .from("game_goals")
      .select("game_id, user_id, count")
      .in("game_id", gameIds)
    if (goals) {
      for (const g of goals) {
        if (!goalsMap[g.game_id]) goalsMap[g.game_id] = {}
        goalsMap[g.game_id][g.user_id] = g.count
      }
    }
  }

  // Build rating history for each player by replaying games
  const ratingHistories: Record<string, { date: string; rating: number }[]> = {}

  // Track running rating per player (start at 1000)
  const runningRating: Record<string, number> = {}
  for (const r of ratings ?? []) {
    runningRating[r.user_id] = 1000
    ratingHistories[r.user_id] = []
  }

  // Replay each completed game chronologically
  for (const game of completedGames ?? []) {
    const teams = teamsMap[game.id] ?? []
    const homeIds = teams.filter((t) => t.team === "home").map((t) => t.user_id)
    const awayIds = teams.filter((t) => t.team === "away").map((t) => t.user_id)

    if (homeIds.length === 0 || awayIds.length === 0) continue

    const homeScore = game.score_home ?? 0
    const awayScore = game.score_away ?? 0

    // Determine result: 1 = win, 0.5 = draw, 0 = loss
    let homeResult: number, awayResult: number
    if (homeScore > awayScore) {
      homeResult = 1; awayResult = 0
    } else if (homeScore < awayScore) {
      homeResult = 0; awayResult = 1
    } else {
      homeResult = 0.5; awayResult = 0.5
    }

    // Average ratings for ELO calculation
    const homeAvg = homeIds.reduce((s, id) => s + (runningRating[id] ?? 1000), 0) / homeIds.length
    const awayAvg = awayIds.reduce((s, id) => s + (runningRating[id] ?? 1000), 0) / awayIds.length
    const expectedHome = 1 / (1 + Math.pow(10, (awayAvg - homeAvg) / 400))
    const expectedAway = 1 - expectedHome

    const gameGoals = goalsMap[game.id] ?? {}

    // Update each player's rating
    for (const uid of homeIds) {
      if (runningRating[uid] === undefined) continue
      const goals = gameGoals[uid] ?? 0
      const change = 32 * (homeResult - expectedHome) + goals * 5
      runningRating[uid] = Math.round(runningRating[uid] + change)
      ratingHistories[uid]?.push({ date: game.date, rating: runningRating[uid] })
    }
    for (const uid of awayIds) {
      if (runningRating[uid] === undefined) continue
      const goals = gameGoals[uid] ?? 0
      const change = 32 * (awayResult - expectedAway) + goals * 5
      runningRating[uid] = Math.round(runningRating[uid] + change)
      ratingHistories[uid]?.push({ date: game.date, rating: runningRating[uid] })
    }
  }

  // Compute group maximums for relative normalization
  const activePlayers = (ratings ?? []).filter((r) => r.games_played > 0)
  const groupMax: GroupMax = {
    winRate: Math.max(...activePlayers.map((r) => r.wins / r.games_played), 0),
    goalsRate: Math.max(...activePlayers.map((r) => r.goals / r.games_played), 0),
    games: Math.max(...activePlayers.map((r) => r.games_played), 0),
    wins: Math.max(...activePlayers.map((r) => r.wins), 0),
    rating: Math.max(...activePlayers.map((r) => r.rating), 0),
  }

  // Build player stats array (only players with games)
  const withGames = (ratings ?? []).filter((r) => r.games_played > 0)
  const players: PlayerStats[] = withGames.map((r, index) => {
    const rank =
      index === 0 || r.rating !== withGames[index - 1].rating
        ? index + 1
        : withGames.findIndex((x) => x.rating === r.rating) + 1

    const profile = r.profile as { display_name: string; avatar_url: string | null } | null
    return {
      userId: r.user_id,
      displayName: profile?.display_name ?? "Unknown",
      avatarUrl: profile?.avatar_url ?? null,
      rating: r.rating,
      wins: r.wins,
      draws: r.draws,
      losses: r.losses,
      goals: r.goals,
      gamesPlayed: r.games_played,
      rank,
      ratingHistory: ratingHistories[r.user_id] ?? [],
    }
  })

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Estatísticas</h2>
      {players.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-muted-foreground">Ainda sem jogadores</p>
        </div>
      ) : (
        <StatsView
          players={players}
          currentUserId={user?.id ?? players[0].userId}
          groupMax={groupMax}
        />
      )}
    </div>
  )
}
