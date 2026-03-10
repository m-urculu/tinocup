// @file scripts/simulate-games.ts
// @description Simulates many full games: create → signup → teams → score → ratings → payments
//   Run with: npx tsx scripts/simulate-games.ts [numGames]

import {
  generateFairestTeams,
  calculateExpected,
  calculateNewRating,
  getEffectiveRating,
} from "../src/lib/rating"

// --- Config ---

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hnzevidrpwljcrvymyed.supabase.co"
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SRK) { console.error("❌ Set SUPABASE_SERVICE_ROLE_KEY"); process.exit(1) }

const NUM_GAMES = parseInt(process.argv[2] ?? "20")
const GROUP_ID = "00000000-0000-0000-0000-000000000001"
const MARCELO_ID = "ba60c0f4-940b-4e54-bf9f-15ff72ada429"
const FIELD_ID = "427b5c03-ed25-4dec-a309-8908f1192557" // Soccer Planet

// All player IDs (28 test + Owner = 29)
const ALL_PLAYERS = [
  MARCELO_ID,
  ...Array.from({ length: 28 }, (_, i) =>
    `10000000-0000-0000-0000-00000000${String(i + 1).padStart(4, "0")}`
  ),
]

// --- Helpers ---

async function rest(method: string, table: string, params?: string, body?: unknown) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params ? `?${params}` : ""}`
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SRK!,
    Authorization: `Bearer ${SRK}`,
  }
  if (method === "POST") headers["Prefer"] = "resolution=merge-duplicates,return=representation"
  if (method === "PATCH") headers["Prefer"] = "return=representation"
  if (method === "DELETE") headers["Prefer"] = "return=minimal"

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok && res.status !== 204) {
    const text = await res.text()
    throw new Error(`${method} ${table}: ${res.status} ${text}`)
  }
  if (res.status === 204 || method === "DELETE") return null
  return res.json()
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function gameDate(index: number): string {
  // Spread games across last 3 months
  const base = new Date("2026-01-05")
  base.setDate(base.getDate() + index * 4 + rand(0, 2))
  return base.toISOString().split("T")[0]
}

// --- Main ---

async function main() {
  console.log(`\n⚽ Simulating ${NUM_GAMES} games\n`)

  // Fetch latest ratings
  let ratingsMap = new Map<string, { id: string; rating: number; shadow_rating: number; games_played: number; wins: number; draws: number; losses: number; goals: number }>()
  const ratings = await rest("GET", "player_ratings", `select=*&group_id=eq.${GROUP_ID}`)
  for (const r of ratings) ratingsMap.set(r.user_id, r)

  for (let g = 0; g < NUM_GAMES; g++) {
    const teamSize = [5, 6, 7][rand(0, 2)]
    const totalNeeded = teamSize * 2
    const date = gameDate(g)
    const times = ["19:00", "20:00", "21:00", "19:30", "20:30"]
    const time = times[rand(0, times.length - 1)]

    // Pick random players — shuffle all 29, take enough for the game + a few extras
    let selectedPlayers = shuffle(ALL_PLAYERS)
    // Include Owner ~75% of the time
    if (Math.random() > 0.25 && !selectedPlayers.slice(0, totalNeeded).includes(MARCELO_ID)) {
      const marceloIdx = selectedPlayers.indexOf(MARCELO_ID)
      const swapIdx = rand(0, totalNeeded - 1)
      ;[selectedPlayers[marceloIdx], selectedPlayers[swapIdx]] = [selectedPlayers[swapIdx], selectedPlayers[marceloIdx]]
    }
    // Take totalNeeded + 0-4 extra signups (some games have subs/extras)
    selectedPlayers = selectedPlayers.slice(0, Math.min(totalNeeded + rand(0, 4), ALL_PLAYERS.length))

    // 1. Create game — random organizer and payer from selected players
    const organizer = selectedPlayers[rand(0, selectedPlayers.length - 1)]
    const payer = selectedPlayers[rand(0, selectedPlayers.length - 1)]
    const [game] = await rest("POST", "games", undefined, {
      group_id: GROUP_ID,
      field_id: FIELD_ID,
      date,
      time,
      team_size: teamSize,
      created_by: organizer,
      cost: 50,
      paid_by: payer,
      status: "upcoming",
    })
    const gameId = game.id

    // 2. Signup players
    const signupInserts = selectedPlayers.map(uid => ({
      game_id: gameId,
      user_id: uid,
      status: "confirmed",
    }))
    await rest("POST", "game_signups", undefined, signupInserts)

    // 3. Generate teams using effective ratings (shadow-balanced)
    const playersForTeams = selectedPlayers.slice(0, totalNeeded).map(uid => {
      const r = ratingsMap.get(uid)
      return {
        userId: uid,
        rating: r ? getEffectiveRating(r.rating, r.shadow_rating, r.games_played) : 1000,
      }
    })
    const teams = generateFairestTeams(playersForTeams, teamSize)

    // 4. Insert teams
    const teamInserts = [
      ...teams.home.map(p => ({ game_id: gameId, user_id: p.userId, team: "home" })),
      ...teams.away.map(p => ({ game_id: gameId, user_id: p.userId, team: "away" })),
    ]
    await rest("POST", "game_teams", undefined, teamInserts)

    // 5. Generate random score
    const scoreHome = rand(0, 7)
    const scoreAway = rand(0, 7)

    await rest("PATCH", "games", `id=eq.${gameId}`, {
      score_home: scoreHome,
      score_away: scoreAway,
      status: "completed",
    })

    // 6. Distribute goals to random players
    const totalGoals = scoreHome + scoreAway
    const goalMap: Record<string, number> = {}
    const homeIds = teams.home.map(p => p.userId)
    const awayIds = teams.away.map(p => p.userId)

    // Distribute home goals
    for (let i = 0; i < scoreHome; i++) {
      const scorer = homeIds[rand(0, homeIds.length - 1)]
      goalMap[scorer] = (goalMap[scorer] ?? 0) + 1
    }
    // Distribute away goals
    for (let i = 0; i < scoreAway; i++) {
      const scorer = awayIds[rand(0, awayIds.length - 1)]
      goalMap[scorer] = (goalMap[scorer] ?? 0) + 1
    }

    if (Object.keys(goalMap).length > 0) {
      const goalInserts = Object.entries(goalMap).map(([userId, count]) => ({
        game_id: gameId,
        user_id: userId,
        count,
      }))
      await rest("POST", "game_goals", undefined, goalInserts)
    }

    // 7. Update ratings
    const homeAvg = homeIds.reduce((s, id) => s + (ratingsMap.get(id)?.rating ?? 1000), 0) / homeIds.length
    const awayAvg = awayIds.reduce((s, id) => s + (ratingsMap.get(id)?.rating ?? 1000), 0) / awayIds.length

    let homeActual: number, awayActual: number
    if (scoreHome > scoreAway) { homeActual = 1; awayActual = 0 }
    else if (scoreHome < scoreAway) { homeActual = 0; awayActual = 1 }
    else { homeActual = 0.5; awayActual = 0.5 }

    const allIds = [...homeIds, ...awayIds]
    for (const uid of allIds) {
      const r = ratingsMap.get(uid)
      if (!r) continue

      const isHome = homeIds.includes(uid)
      const expected = isHome
        ? calculateExpected(homeAvg, awayAvg)
        : calculateExpected(awayAvg, homeAvg)
      const actual = isHome ? homeActual : awayActual
      const playerGoals = goalMap[uid] ?? 0
      const newRating = calculateNewRating(r.rating, expected, actual, playerGoals)

      const isWin = (isHome && scoreHome > scoreAway) || (!isHome && scoreAway > scoreHome)
      const isDraw = scoreHome === scoreAway
      const isLoss = (isHome && scoreHome < scoreAway) || (!isHome && scoreAway < scoreHome)

      r.rating = newRating
      r.games_played += 1
      r.wins += isWin ? 1 : 0
      r.draws += isDraw ? 1 : 0
      r.losses += isLoss ? 1 : 0
      r.goals += playerGoals

      await rest("PATCH", "player_ratings", `id=eq.${r.id}`, {
        rating: newRating,
        games_played: r.games_played,
        wins: r.wins,
        draws: r.draws,
        losses: r.losses,
        goals: r.goals,
        updated_at: new Date().toISOString(),
      })
    }

    // 8. Create payments
    const perPlayer = 50 / allIds.length
    const paymentInserts = allIds.map(uid => ({
      game_id: gameId,
      user_id: uid,
      amount: Math.round(perPlayer * 100) / 100,
      paid: Math.random() > 0.4, // ~60% paid randomly
    }))
    await rest("POST", "payments", undefined, paymentInserts)

    const result = scoreHome > scoreAway ? "Home win" : scoreHome < scoreAway ? "Away win" : "Draw"
    console.log(`  Game ${g + 1}/${NUM_GAMES} | ${date} ${time} | ${teamSize}v${teamSize} | ${scoreHome}-${scoreAway} (${result}) | ${totalGoals} goals`)
  }

  // Final leaderboard
  console.log("\n🏆 Final Leaderboard:")
  const sorted = [...ratingsMap.values()].sort((a, b) => b.rating - a.rating)
  const names = await rest("GET", "profiles", `select=id,display_name&id=in.(${sorted.map(r => r.id.split(",")[0]).join(",")})`)
  // Actually get names by user_id
  const nameMap = new Map<string, string>()
  const profiles = await rest("GET", "profiles", `select=id,display_name`)
  for (const p of profiles) nameMap.set(p.id, p.display_name)

  for (const r of sorted) {
    const userId = [...ratingsMap.entries()].find(([, v]) => v === r)?.[0] ?? "?"
    const name = nameMap.get(userId) ?? userId.slice(-4)
    const winRate = r.games_played > 0 ? ((r.wins / r.games_played) * 100).toFixed(0) : "0"
    console.log(`  ${String(r.rating).padStart(4)} | ${name.padEnd(12)} | ${r.games_played}GP ${r.wins}W ${r.draws}D ${r.losses}L | ⚽${r.goals} | ${winRate}% WR`)
  }

  console.log(`\n✅ ${NUM_GAMES} games simulated!`)
}

main().catch(err => {
  console.error("❌ Error:", err.message)
  process.exit(1)
})
