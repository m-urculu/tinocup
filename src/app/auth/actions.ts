"use server"

// @file src/app/auth/actions.ts
// @description Auth server actions — phone validation before OTP
// @depends lib/supabase/server

import { createClient } from "@/lib/supabase/server"

export async function checkPhoneExists(phone: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .single()

  return { exists: !!data }
}
