// @file src/app/api/cron/game-reminders/route.ts
// @description Cron endpoint that sends SMS reminders to confirmed players
//   on game day. Only fires for games with status 'teams_set' and reminder_sent = false.
// @depends lib/supabase/admin, lib/twilio

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendSMS } from "@/lib/twilio"

// --- Helpers ---

function getLisbonDate() {
  const now = new Date()
  const lisbon = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)

  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Lisbon",
      hour: "2-digit",
      hour12: false,
    }).format(now)
  )

  return { date: lisbon, hour }
}

function buildMessage(
  groupName: string,
  gameTime: string,
  field: { name: string; address: string | null } | null
) {
  let msg = `⚽ ${groupName} — Lembrete de Jogo!\nTens jogo hoje às ${gameTime}.`
  if (field) {
    const location = field.address
      ? `${field.name} — ${field.address}`
      : field.name
    msg += `\n📍 ${location}`
  }
  msg += "\nBoa sorte! 💪"
  return msg
}

// --- API Handler ---

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { date: today, hour: currentHour } = getLisbonDate()

  // Fetch games today that are fully set and not yet reminded
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id, time, field_id, group_id")
    .eq("date", today)
    .eq("status", "teams_set")
    .eq("reminder_sent", false)

  if (gamesError) {
    return NextResponse.json({ error: gamesError.message }, { status: 500 })
  }

  if (!games || games.length === 0) {
    return NextResponse.json({ message: "No games to remind", sent: 0 })
  }

  const results: { gameId: string; smsSent: number }[] = []

  for (const game of games) {
    // Only send once we're within 4 hours of game time
    const gameHour = Number(game.time.split(":")[0])
    if (gameHour - currentHour > 4) continue

    // Fetch group name
    const { data: group } = await supabase
      .from("groups")
      .select("name")
      .eq("id", game.group_id)
      .single()

    // Fetch field info (optional)
    let field: { name: string; address: string | null } | null = null
    if (game.field_id) {
      const { data: fieldData } = await supabase
        .from("fields")
        .select("name, address")
        .eq("id", game.field_id)
        .single()
      field = fieldData
    }

    // Fetch confirmed players with phone numbers
    const { data: signups } = await supabase
      .from("game_signups")
      .select("user_id")
      .eq("game_id", game.id)
      .eq("status", "confirmed")

    if (!signups || signups.length === 0) continue

    const playerIds = signups.map((s) => s.user_id)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("phone")
      .in("id", playerIds)

    if (!profiles || profiles.length === 0) continue

    const message = buildMessage(
      group?.name ?? "Jogo",
      game.time,
      field
    )

    // TODO: Remove test filter after verifying SMS works
    const TEST_ONLY_PHONE = "+351900000099" // Owner
    const filteredProfiles = profiles.filter((p) => p.phone === TEST_ONLY_PHONE)

    let smsSent = 0
    for (const profile of filteredProfiles) {
      if (!profile.phone) continue
      try {
        await sendSMS(profile.phone, message)
        smsSent++
      } catch (err) {
        console.error(`Failed to send SMS to ${profile.phone}:`, err)
      }
    }

    // Mark game as reminded
    await supabase
      .from("games")
      .update({ reminder_sent: true })
      .eq("id", game.id)

    results.push({ gameId: game.id, smsSent })
  }

  return NextResponse.json({
    message: "Reminders processed",
    results,
    sent: results.reduce((sum, r) => sum + r.smsSent, 0),
  })
}
