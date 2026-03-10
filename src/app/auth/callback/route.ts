// @file src/app/auth/callback/route.ts
// @description Auth callback — handles code exchange, creates profile + auto-joins default group
// @depends lib/supabase/server, lib/constants

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { DEFAULT_GROUP_SLUG } from "@/lib/constants"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        await ensureProfileAndGroup(supabase, user)
        return NextResponse.redirect(`${origin}/group/${DEFAULT_GROUP_SLUG}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureProfileAndGroup(supabase: any, user: any) {
  // Resolve default group UUID from slug
  const { data: defaultGroup } = await supabase
    .from("groups")
    .select("id")
    .eq("slug", DEFAULT_GROUP_SLUG)
    .single()

  if (!defaultGroup) return

  const groupId = defaultGroup.id

  // Auto-create profile if missing
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single()

  if (!profile) {
    await supabase.from("profiles").insert({
      id: user.id,
      phone: user.phone ?? "",
      display_name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.phone ??
        "Player",
    })
  }

  // Auto-join default group
  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single()

  if (!membership) {
    await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: user.id,
      role: "member",
    })

    await supabase.from("player_ratings").insert({
      user_id: user.id,
      group_id: groupId,
    })
  }
}
