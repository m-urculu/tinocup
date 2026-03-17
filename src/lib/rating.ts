// @file src/lib/rating.ts
// @description ELO rating calculation and team generation algorithm

// --- Constants ---
const K_FACTOR = 32
const GOAL_BONUS = 12
const AUTO_GOAL_PENALTY = -12
const BASE_RATING = 1000
const SHADOW_DECAY_GAMES = 10

// --- ELO Calculation ---
export function calculateExpected(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

export function calculateNewRating(
  currentRating: number,
  expected: number,
  actual: number,
  goalsScored: number,
  autoGoals: number = 0
): number {
  const eloChange = K_FACTOR * (actual - expected)
  const goalBonus = goalsScored * GOAL_BONUS
  const autoGoalPenalty = autoGoals * AUTO_GOAL_PENALTY
  return Math.round(currentRating + eloChange + goalBonus + autoGoalPenalty)
}

// --- Shadow Rating (Bayesian Prior) ---
// Blends shadow_rating (prior knowledge) with actual rating.
// Weight starts at 1.0 (pure shadow) and drops to 0 over SHADOW_DECAY_GAMES.
export function getEffectiveRating(
  rating: number,
  shadowRating: number,
  gamesPlayed: number
): number {
  const weight = Math.max(0, 1 - gamesPlayed / SHADOW_DECAY_GAMES)
  return Math.round(weight * shadowRating + (1 - weight) * rating)
}

type PlayerForTeam = {
  userId: string
  rating: number
}

// --- Team Generation (Snake Draft) ---
export function generateTeams(
  players: PlayerForTeam[],
  teamSize: number
): { home: PlayerForTeam[]; away: PlayerForTeam[] } {
  const totalNeeded = teamSize * 2
  const available = players.slice(0, totalNeeded)

  // Sort by rating descending
  const sorted = [...available].sort((a, b) => b.rating - a.rating)

  const home: PlayerForTeam[] = []
  const away: PlayerForTeam[] = []

  // Snake draft: 1st→Home, 2nd→Away, 3rd→Away, 4th→Home, ...
  sorted.forEach((player, index) => {
    const round = Math.floor(index / 2)
    const isEvenRound = round % 2 === 0

    if (index % 2 === 0) {
      // First pick of pair
      ;(isEvenRound ? home : away).push(player)
    } else {
      // Second pick of pair
      ;(isEvenRound ? away : home).push(player)
    }
  })

  // Randomize within each team
  shuffleArray(home)
  shuffleArray(away)

  return { home, away }
}

// --- Generate multiple team permutations and pick the fairest ---
export function generateFairestTeams(
  players: PlayerForTeam[],
  teamSize: number,
  permutations: number = 100
): { home: PlayerForTeam[]; away: PlayerForTeam[] } {
  let bestTeams = generateTeams(players, teamSize)
  let bestGap = getTeamRatingGap(bestTeams.home, bestTeams.away)

  for (let i = 1; i < permutations; i++) {
    const shuffled = [...players]
    // Add slight randomization to ratings to get variety
    const jittered = shuffled.map((p) => ({
      ...p,
      rating: p.rating + (Math.random() - 0.5) * 50,
    }))
    const teams = generateTeams(jittered, teamSize)
    // Map back to original ratings
    const homeOriginal = teams.home.map((p) => players.find((op) => op.userId === p.userId)!)
    const awayOriginal = teams.away.map((p) => players.find((op) => op.userId === p.userId)!)
    const gap = getTeamRatingGap(homeOriginal, awayOriginal)

    if (gap < bestGap) {
      bestGap = gap
      bestTeams = { home: homeOriginal, away: awayOriginal }
    }
  }

  return bestTeams
}

function getTeamRatingGap(home: PlayerForTeam[], away: PlayerForTeam[]): number {
  const homeAvg = home.reduce((sum, p) => sum + p.rating, 0) / home.length
  const awayAvg = away.reduce((sum, p) => sum + p.rating, 0) / away.length
  return Math.abs(homeAvg - awayAvg)
}

function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}

export { BASE_RATING, K_FACTOR, GOAL_BONUS, AUTO_GOAL_PENALTY, SHADOW_DECAY_GAMES }
