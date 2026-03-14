"use server"

// @file src/app/group/[slug]/games/[gameId]/actions.ts
// @description Server actions for game detail — signup, delete, teams, score
// @depends lib/supabase/server, lib/rating

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  generateFairestTeams,
  calculateExpected,
  calculateNewRating,
  getEffectiveRating,
} from "@/lib/rating"

export async function signupForGame(
  gameId: string,
  groupSlug: string,
  status: "confirmed" | "declined"
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  // Check capacity if confirming
  if (status === "confirmed") {
    const { data: game } = await supabase
      .from("games")
      .select("team_size")
      .eq("id", gameId)
      .single()

    if (game) {
      const maxPlayers = game.team_size * 2
      const { count } = await supabase
        .from("game_signups")
        .select("id", { count: "exact", head: true })
        .eq("game_id", gameId)
        .eq("status", "confirmed")
        .neq("user_id", user.id)

      if ((count ?? 0) >= maxPlayers) {
        return { error: "Jogo cheio" }
      }
    }
  }

  const { error } = await supabase.from("game_signups").upsert(
    {
      game_id: gameId,
      user_id: user.id,
      status,
    },
    { onConflict: "game_id,user_id" }
  )

  if (error) return { error: error.message }

  revalidatePath(`/group/${groupSlug}/games/${gameId}`)
  return { error: null }
}

export async function deleteGame(gameId: string, groupSlug: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  // Verify creator
  const { data: game } = await supabase
    .from("games")
    .select("created_by")
    .eq("id", gameId)
    .single()

  if (!game || game.created_by !== user.id) {
    return { error: "Apenas o criador pode eliminar este jogo" }
  }

  const { error } = await supabase.from("games").delete().eq("id", gameId)

  if (error) return { error: error.message }

  revalidatePath(`/group/${groupSlug}/games`)
  return { error: null }
}

// --- Generate Teams ---

export async function generateTeamsAction(gameId: string, groupSlug: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  // Fetch game to get team_size and group_id
  const { data: game } = await supabase
    .from("games")
    .select("team_size, group_id")
    .eq("id", gameId)
    .single()

  if (!game) return { error: "Jogo não encontrado" }

  const groupId = game.group_id
  const totalNeeded = game.team_size * 2

  // Fetch confirmed signups
  const { data: signups } = await supabase
    .from("game_signups")
    .select("user_id")
    .eq("game_id", gameId)
    .eq("status", "confirmed")

  if (!signups || signups.length < totalNeeded) {
    return { error: `São necessários ${totalNeeded} jogadores confirmados` }
  }

  const confirmedIds = signups.map((s) => s.user_id)

  // Fetch player ratings
  const { data: ratings } = await supabase
    .from("player_ratings")
    .select("*")
    .eq("group_id", groupId)
    .in("user_id", confirmedIds)

  if (!ratings || ratings.length < totalNeeded) {
    return { error: `São necessários ${totalNeeded} jogadores com rating` }
  }

  // Use effective ratings (shadow-balanced) for team generation
  const players = ratings.map((r) => ({
    userId: r.user_id,
    rating: getEffectiveRating(r.rating, r.shadow_rating, r.games_played),
  }))

  const teams = generateFairestTeams(players, game.team_size)

  // Clear existing teams
  await supabase.from("game_teams").delete().eq("game_id", gameId)

  // Insert new teams
  const teamInserts = [
    ...teams.home.map((p) => ({
      game_id: gameId,
      user_id: p.userId,
      team: "home" as const,
    })),
    ...teams.away.map((p) => ({
      game_id: gameId,
      user_id: p.userId,
      team: "away" as const,
    })),
  ]

  const { error } = await supabase.from("game_teams").insert(teamInserts)
  if (error) return { error: error.message }

  // Update game status
  await supabase
    .from("games")
    .update({ status: "teams_set" })
    .eq("id", gameId)

  revalidatePath(`/group/${groupSlug}/games/${gameId}`)
  return { error: null }
}

// --- Submit Score ---

export async function submitScoreAction(
  gameId: string,
  groupSlug: string,
  scoreHome: number,
  scoreAway: number,
  goals: Record<string, number>
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  // Fetch group_id from game
  const { data: gameRow } = await supabase
    .from("games")
    .select("group_id")
    .eq("id", gameId)
    .single()

  if (!gameRow) return { error: "Jogo não encontrado" }
  const groupId = gameRow.group_id

  // Update game score + status
  const { error: scoreError } = await supabase
    .from("games")
    .update({
      score_home: scoreHome,
      score_away: scoreAway,
      status: "completed",
    })
    .eq("id", gameId)

  if (scoreError) return { error: scoreError.message }

  // Insert goal records
  const goalInserts = Object.entries(goals)
    .filter(([, count]) => count > 0)
    .map(([userId, count]) => ({
      game_id: gameId,
      user_id: userId,
      count,
    }))

  if (goalInserts.length > 0) {
    await supabase.from("game_goals").insert(goalInserts)
  }

  // Fetch teams
  const { data: teams } = await supabase
    .from("game_teams")
    .select("user_id, team")
    .eq("game_id", gameId)

  if (!teams) return { error: "Equipas não encontradas" }

  const homeIds = teams.filter((t) => t.team === "home").map((t) => t.user_id)
  const awayIds = teams.filter((t) => t.team === "away").map((t) => t.user_id)
  const allIds = [...homeIds, ...awayIds]

  // Fetch player ratings
  const { data: ratings } = await supabase
    .from("player_ratings")
    .select("*")
    .eq("group_id", groupId)
    .in("user_id", allIds)

  if (ratings) {
    const homeAvg =
      ratings
        .filter((r) => homeIds.includes(r.user_id))
        .reduce((sum, r) => sum + r.rating, 0) / homeIds.length
    const awayAvg =
      ratings
        .filter((r) => awayIds.includes(r.user_id))
        .reduce((sum, r) => sum + r.rating, 0) / awayIds.length

    // Determine result
    let homeActual: number, awayActual: number
    if (scoreHome > scoreAway) {
      homeActual = 1
      awayActual = 0
    } else if (scoreHome < scoreAway) {
      homeActual = 0
      awayActual = 1
    } else {
      homeActual = 0.5
      awayActual = 0.5
    }

    for (const rating of ratings) {
      const isHome = homeIds.includes(rating.user_id)
      const expected = isHome
        ? calculateExpected(homeAvg, awayAvg)
        : calculateExpected(awayAvg, homeAvg)
      const actual = isHome ? homeActual : awayActual
      const playerGoals = goals[rating.user_id] ?? 0
      const newRating = calculateNewRating(
        rating.rating,
        expected,
        actual,
        playerGoals
      )

      const isWin =
        (isHome && scoreHome > scoreAway) ||
        (!isHome && scoreAway > scoreHome)
      const isDraw = scoreHome === scoreAway
      const isLoss =
        (isHome && scoreHome < scoreAway) ||
        (!isHome && scoreAway < scoreHome)

      await supabase
        .from("player_ratings")
        .update({
          rating: newRating,
          games_played: rating.games_played + 1,
          wins: rating.wins + (isWin ? 1 : 0),
          draws: rating.draws + (isDraw ? 1 : 0),
          losses: rating.losses + (isLoss ? 1 : 0),
          goals: rating.goals + playerGoals,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rating.id)
    }
  }

  revalidatePath(`/group/${groupSlug}/games/${gameId}`)
  return { error: null }
}

// --- Pick Up Tab ---

export async function pickUpTabAction(
  gameId: string,
  groupSlug: string,
  totalAmount: number
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  // Check if someone already picked up the tab
  const { data: game } = await supabase
    .from("games")
    .select("paid_by, status")
    .eq("id", gameId)
    .single()

  if (!game) return { error: "Jogo não encontrado" }
  if (game.status !== "completed") return { error: "O jogo ainda não está concluído" }
  if (game.paid_by) return { error: "Alguém já pagou a conta" }

  // Get all players who played (from game_teams)
  const { data: teams } = await supabase
    .from("game_teams")
    .select("user_id")
    .eq("game_id", gameId)

  if (!teams || teams.length === 0) return { error: "Jogadores não encontrados" }

  const allPlayerIds = teams.map((t) => t.user_id)
  const otherPlayerIds = allPlayerIds.filter((id) => id !== user.id)
  const perPlayer = allPlayerIds.length > 0
    ? Math.round((totalAmount / allPlayerIds.length) * 100) / 100
    : 0

  // Set paid_by and cost on game
  const { error: updateError } = await supabase
    .from("games")
    .update({ paid_by: user.id, cost: totalAmount })
    .eq("id", gameId)

  if (updateError) return { error: updateError.message }

  // Create payment records — payer auto-paid (if they played), others unpaid
  const payerPlayed = allPlayerIds.includes(user.id)
  const paymentInserts = [
    ...(payerPlayed
      ? [{
          game_id: gameId,
          user_id: user.id,
          amount: perPlayer,
          paid: true,
          paid_at: new Date().toISOString(),
        }]
      : []),
    ...otherPlayerIds.map((userId) => ({
      game_id: gameId,
      user_id: userId,
      amount: perPlayer,
      paid: false,
      paid_at: null,
    })),
  ]
  await supabase.from("payments").insert(paymentInserts)

  revalidatePath(`/group/${groupSlug}/games/${gameId}`)
  revalidatePath(`/group/${groupSlug}/payments`)
  return { error: null }
}

// --- Cast MVP Vote ---

export async function castMvpVoteAction(
  gameId: string,
  groupSlug: string,
  votedForUserId: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  // Cannot vote for yourself
  if (votedForUserId === user.id) {
    return { error: "Não podes votar em ti próprio" }
  }

  // Verify game is completed
  const { data: game } = await supabase
    .from("games")
    .select("status")
    .eq("id", gameId)
    .single()

  if (!game) return { error: "Jogo não encontrado" }
  if (game.status !== "completed") return { error: "O jogo ainda não está concluído" }

  // Verify both voter and target played in this game
  const { data: teams } = await supabase
    .from("game_teams")
    .select("user_id")
    .eq("game_id", gameId)

  const playerIds = (teams ?? []).map((t) => t.user_id)
  if (!playerIds.includes(user.id)) {
    return { error: "Não participaste neste jogo" }
  }
  if (!playerIds.includes(votedForUserId)) {
    return { error: "Esse jogador não participou neste jogo" }
  }

  // Upsert vote (allows changing vote)
  const { error } = await supabase.from("game_mvp_votes").upsert(
    {
      game_id: gameId,
      voter_id: user.id,
      voted_for: votedForUserId,
    },
    { onConflict: "game_id,voter_id" }
  )

  if (error) return { error: error.message }

  revalidatePath(`/group/${groupSlug}/games/${gameId}`)
  revalidatePath(`/group/${groupSlug}`)
  return { error: null }
}

// --- Update Phone and Signup ---

export async function updatePhoneAndSignup(
  gameId: string,
  groupSlug: string,
  phone: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  // Update profile phone
  const { error: phoneError } = await supabase
    .from("profiles")
    .update({ phone })
    .eq("id", user.id)

  if (phoneError) return { error: phoneError.message }

  // Signup as confirmed
  const { error } = await supabase.from("game_signups").upsert(
    {
      game_id: gameId,
      user_id: user.id,
      status: "confirmed" as const,
    },
    { onConflict: "game_id,user_id" }
  )

  if (error) return { error: error.message }

  revalidatePath(`/group/${groupSlug}/games/${gameId}`)
  return { error: null }
}
