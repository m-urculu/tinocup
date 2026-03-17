"use server"

// @file src/app/group/[slug]/settings/actions.ts
// @description Server action to invite a player by phone number — creates auth user + profile + group membership
// @depends lib/supabase/server, lib/supabase/admin

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// --- Helpers ---

function normalizePhone(raw: string): string {
  let phone = raw.trim().replace(/\s/g, "")
  if (!phone.startsWith("+")) {
    phone = `+351${phone}`
  }
  return phone
}

// --- Server Action ---

export async function inviteByPhone(groupId: string, rawPhone: string) {
  const supabase = await createClient()
  const admin = createAdminClient()

  // Verify caller is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado" }

  // Verify caller is admin of the group
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single()

  if (!membership || membership.role !== "admin") {
    return { error: "Apenas administradores podem convidar jogadores" }
  }

  const phone = normalizePhone(rawPhone)

  // Check if a profile already exists with this phone
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .single()

  if (existingProfile) {
    // Profile exists — check if already in group
    const { data: existingMember } = await admin
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", existingProfile.id)
      .single()

    if (existingMember) {
      return { error: "Este número já está no grupo" }
    }

    // Add to group + init ratings
    const { error: memberError } = await admin
      .from("group_members")
      .insert({ group_id: groupId, user_id: existingProfile.id, role: "member" })

    if (memberError) return { error: memberError.message }

    await admin
      .from("player_ratings")
      .insert({ user_id: existingProfile.id, group_id: groupId, rating: 1000 })

    return { error: null }
  }

  // No profile exists — create auth user + profile + membership + ratings
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    phone,
    phone_confirm: true,
  })

  if (createError) return { error: createError.message }

  const newUserId = newUser.user.id

  // Insert profile with phone as display_name (marker for "needs setup")
  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: newUserId, phone, display_name: phone })

  if (profileError) return { error: profileError.message }

  // Insert group membership
  const { error: memberError } = await admin
    .from("group_members")
    .insert({ group_id: groupId, user_id: newUserId, role: "member" })

  if (memberError) return { error: memberError.message }

  // Insert default player ratings
  await admin
    .from("player_ratings")
    .insert({ user_id: newUserId, group_id: groupId, rating: 1000 })

  return { error: null }
}
