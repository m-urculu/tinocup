// @file scripts/test-game-flow.ts
// @description End-to-end test: generate teams → submit score → verify stats + payments
//   Run with: npx tsx scripts/test-game-flow.ts <gameId>

import {
  generateFairestTeams,
  calculateExpected,
  calculateNewRating,
} from "../src/lib/rating"

// --- Config ---

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hnzevidrpwljcrvymyed.supabase.co"
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SRK) { console.error("❌ Set SUPABASE_SERVICE_ROLE_KEY"); process.exit(1) }

const GAME_ID = process.argv[2]
if (!GAME_ID) { console.error("❌ Usage: npx tsx scripts/test-game-flow.ts <gameId>"); process.exit(1) }

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

// --- Main ---

async function main() {
  console.log("\n🧪 End-to-End Game Flow Test\n")

  // 1. Fetch game
  const [game] = await rest("GET", "games", `select=*&id=eq.${GAME_ID}`)
  console.log(`📋 Game: ${game.date} | Status: ${game.status} | Team size: ${game.team_size} | Cost: €${game.cost}`)
  const GROUP_ID = game.group_id

  // 2. Fetch confirmed signups
  const signups = await rest("GET", "game_signups", `select=user_id&game_id=eq.${GAME_ID}&status=eq.confirmed`)
  console.log(`👥 ${signups.length} confirmed signups`)
  const confirmedIds = signups.map((s: { user_id: string }) => s.user_id)

  // 3. Fetch player ratings
  const ratings = await rest("GET", "player_ratings", `select=*&group_id=eq.${GROUP_ID}&user_id=in.(${confirmedIds.join(",")})`)
  console.log(`⭐ ${ratings.length} player ratings found`)

  // 4. Generate teams
  console.log("\n--- Generating Teams ---")
  const players = ratings.map((r: { user_id: string; rating: number }) => ({
    userId: r.user_id,
    rating: r.rating,
  }))
  const teams = generateFairestTeams(players, game.team_size)

  const homeAvg = teams.home.reduce((s, p) => s + p.rating, 0) / teams.home.length
  const awayAvg = teams.away.reduce((s, p) => s + p.rating, 0) / teams.away.length
  console.log(`🏠 Home (avg ${homeAvg.toFixed(0)}): ${teams.home.map(p => p.rating).join(", ")}`)
  console.log(`✈️  Away (avg ${awayAvg.toFixed(0)}): ${teams.away.map(p => p.rating).join(", ")}`)
  console.log(`📊 Rating gap: ${Math.abs(homeAvg - awayAvg).toFixed(1)}`)

  // Clear existing teams + insert new ones
  await rest("DELETE", "game_teams", `game_id=eq.${GAME_ID}`)
  const teamInserts = [
    ...teams.home.map(p => ({ game_id: GAME_ID, user_id: p.userId, team: "home" })),
    ...teams.away.map(p => ({ game_id: GAME_ID, user_id: p.userId, team: "away" })),
  ]
  await rest("POST", "game_teams", undefined, teamInserts)
  await rest("PATCH", "games", `id=eq.${GAME_ID}`, { status: "teams_set" })
  console.log("✅ Teams saved, game status → teams_set")

  // 5. Submit score (3-2 home win)
  console.log("\n--- Submitting Score (3-2) ---")
  const scoreHome = 3
  const scoreAway = 2

  await rest("PATCH", "games", `id=eq.${GAME_ID}`, {
    score_home: scoreHome,
    score_away: scoreAway,
    status: "completed",
  })

  // Give goals to first 3 home players (1 each) and first 2 away players (1 each)
  const goalScorers: Record<string, number> = {}
  teams.home.slice(0, 3).forEach(p => { goalScorers[p.userId] = 1 })
  teams.away.slice(0, 2).forEach(p => { goalScorers[p.userId] = 1 })

  const goalInserts = Object.entries(goalScorers).map(([userId, count]) => ({
    game_id: GAME_ID,
    user_id: userId,
    count,
  }))
  await rest("POST", "game_goals", undefined, goalInserts)
  console.log(`⚽ ${goalInserts.length} goalscorer records saved`)

  // 6. Update ratings
  console.log("\n--- Updating Ratings ---")
  const homeIds = teams.home.map(p => p.userId)
  const awayIds = teams.away.map(p => p.userId)

  let homeActual: number, awayActual: number
  if (scoreHome > scoreAway) { homeActual = 1; awayActual = 0 }
  else if (scoreHome < scoreAway) { homeActual = 0; awayActual = 1 }
  else { homeActual = 0.5; awayActual = 0.5 }

  for (const rating of ratings) {
    const isHome = homeIds.includes(rating.user_id)
    const expected = isHome
      ? calculateExpected(homeAvg, awayAvg)
      : calculateExpected(awayAvg, homeAvg)
    const actual = isHome ? homeActual : awayActual
    const playerGoals = goalScorers[rating.user_id] ?? 0
    const newRating = calculateNewRating(rating.rating, expected, actual, playerGoals)

    const isWin = (isHome && scoreHome > scoreAway) || (!isHome && scoreAway > scoreHome)
    const isDraw = scoreHome === scoreAway
    const isLoss = (isHome && scoreHome < scoreAway) || (!isHome && scoreAway < scoreHome)

    await rest("PATCH", "player_ratings", `id=eq.${rating.id}`, {
      rating: newRating,
      games_played: rating.games_played + 1,
      wins: rating.wins + (isWin ? 1 : 0),
      draws: rating.draws + (isDraw ? 1 : 0),
      losses: rating.losses + (isLoss ? 1 : 0),
      goals: rating.goals + playerGoals,
      updated_at: new Date().toISOString(),
    })

    const arrow = newRating > rating.rating ? "📈" : newRating < rating.rating ? "📉" : "➡️"
    console.log(`  ${arrow} ${rating.user_id.slice(-4)}: ${rating.rating} → ${newRating} (${isWin ? "W" : isLoss ? "L" : "D"}) ${playerGoals > 0 ? `⚽×${playerGoals}` : ""}`)
  }

  // 7. Create payments
  console.log("\n--- Creating Payments ---")
  const allIds = [...homeIds, ...awayIds]
  const perPlayer = game.cost / allIds.length
  const paymentInserts = allIds.map(userId => ({
    game_id: GAME_ID,
    user_id: userId,
    amount: Math.round(perPlayer * 100) / 100,
    paid: false,
  }))
  await rest("POST", "payments", undefined, paymentInserts)
  console.log(`💰 ${paymentInserts.length} payment records created (€${perPlayer.toFixed(2)} each)`)

  // 8. Verify final state
  console.log("\n--- Final Verification ---")
  const [finalGame] = await rest("GET", "games", `select=status,score_home,score_away,cost&id=eq.${GAME_ID}`)
  console.log(`📋 Game: ${finalGame.status} | Score: ${finalGame.score_home}-${finalGame.score_away} | Cost: €${finalGame.cost}`)

  const finalRatings = await rest("GET", "player_ratings", `select=user_id,rating,games_played,wins,losses,draws,goals&group_id=eq.${GROUP_ID}&order=rating.desc`)
  console.log("\n🏆 Updated Leaderboard:")
  for (const r of finalRatings) {
    console.log(`  ${r.rating} | ${r.wins}W ${r.draws}D ${r.losses}L | ⚽${r.goals} | ${r.user_id.slice(-4)}`)
  }

  const payments = await rest("GET", "payments", `select=user_id,amount,paid&game_id=eq.${GAME_ID}`)
  console.log(`\n💳 ${payments.length} payment records | Total: €${payments.reduce((s: number, p: { amount: number }) => s + p.amount, 0).toFixed(2)}`)

  console.log("\n✅ Full game lifecycle test PASSED!")
}

main().catch(err => {
  console.error("❌ Test failed:", err.message)
  process.exit(1)
})
