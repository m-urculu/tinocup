"use server"

// @file src/app/group/[id]/games/new/actions.ts
// @description Server action for creating a game + auto-signup creator
// @depends lib/supabase/server

import { createClient } from "@/lib/supabase/server"

export async function createGame(
  groupId: string,
  data: {
    date: string
    time: string
    teamSize: number
    locationName: string
  }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado", gameId: null }

  // Resolve field from location name
  let fieldId: string | null = null
  let gameCost: number | null = null

  if (data.locationName.trim()) {
    const { data: existing } = await supabase
      .from("fields")
      .select("id, price_per_hour")
      .eq("group_id", groupId)
      .eq("name", data.locationName.trim())
      .single()

    if (existing) {
      fieldId = existing.id
      if (existing.price_per_hour > 0) gameCost = existing.price_per_hour
    } else {
      const { data: newField, error: fieldError } = await supabase
        .from("fields")
        .insert({
          group_id: groupId,
          name: data.locationName.trim(),
          price_per_hour: 0,
        })
        .select()
        .single()

      if (fieldError) return { error: fieldError.message, gameId: null }
      fieldId = newField.id
    }
  }

  // Create game
  const { data: game, error } = await supabase
    .from("games")
    .insert({
      group_id: groupId,
      field_id: fieldId,
      date: data.date,
      time: data.time,
      team_size: data.teamSize,
      created_by: user.id,
      cost: gameCost,
      paid_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message, gameId: null }

  // Auto-signup creator as confirmed
  await supabase.from("game_signups").insert({
    game_id: game.id,
    user_id: user.id,
    status: "confirmed",
  })

  return { error: null, gameId: game.id }
}
