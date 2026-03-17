// @file src/app/page.tsx
// @description Landing page with WhatsApp OTP login — auto-creates profile + joins group on first login
// @depends components/LoginForm, lib/constants, lib/supabase/server

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LoginForm } from "@/components/LoginForm"
import { DEFAULT_GROUP_SLUG } from "@/lib/constants"

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Check if profile exists by user ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single()

    if (!profile && user.phone) {
      // Phone OTP login — match existing profile by phone and update its ID
      const phone = user.phone.startsWith("+") ? user.phone : `+${user.phone}`
      const { data: existingByPhone } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .single()

      if (existingByPhone) {
        // Migrate all records from old ID to new auth user ID
        const oldId = existingByPhone.id
        await supabase.from("player_ratings").update({ user_id: user.id }).eq("user_id", oldId)
        await supabase.from("group_members").update({ user_id: user.id }).eq("user_id", oldId)
        await supabase.from("profiles").update({ id: user.id }).eq("id", oldId)
      }
    }

    // Check if profile needs name setup (invited users have phone as display_name)
    const { data: prof } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()

    if (prof?.display_name?.startsWith("+")) {
      redirect("/profile/setup")
    }

    redirect(`/group/${DEFAULT_GROUP_SLUG}`)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* --- Logo --- */}
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-heading)] text-6xl tracking-[0.2em] text-gold-shimmer">
            TINOCUP
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O teu grupo de futebol
          </p>
        </div>

        {/* --- Login Card --- */}
        <div className="glass rounded-2xl p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
