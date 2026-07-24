// @file scripts/seed-signups.ts
// @description Signs up all 12 test users + the group owner as confirmed for a game.
//   Run with: npx tsx scripts/seed-signups.ts <gameId>

// --- Config ---

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hnzevidrpwljcrvymyed.supabase.co"
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Set SUPABASE_SERVICE_ROLE_KEY env var first")
  console.error("   Get it from: Supabase Dashboard → Project Settings → API → service_role key")
  process.exit(1)
}

const gameId = process.argv[2]
if (!gameId) {
  console.error("❌ Usage: npx tsx scripts/seed-signups.ts <gameId>")
  process.exit(1)
}

// --- Helpers ---

function testUserId(index: number): string {
  return `10000000-0000-0000-0000-00000000${String(index + 1).padStart(4, "0")}`
}

async function adminQuery(table: string, method: "POST", body: unknown): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/${table}`
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok && res.status !== 409) {
    const text = await res.text()
    throw new Error(`${method} ${table} failed: ${res.status} ${text}`)
  }
}

async function adminSelect(table: string, queryParams: string): Promise<unknown[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${queryParams}`
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GET ${table} failed: ${res.status} ${text}`)
  }
  return res.json()
}

// --- Main ---

async function main() {
  console.log(`\n⚽ Signing up players for game ${gameId}\n`)

  // Verify game exists
  const games = (await adminSelect("games", `select=id,group_id&id=eq.${gameId}`)) as { id: string; group_id: string }[]
  if (games.length === 0) {
    console.error("❌ Game not found")
    process.exit(1)
  }

  const groupId = games[0].group_id

  // Find the group owner — find any user in the group that isn't a test user
  const members = (await adminSelect(
    "group_members",
    `select=user_id&group_id=eq.${groupId}`
  )) as { user_id: string }[]

  const testUserIds = Array.from({ length: 12 }, (_, i) => testUserId(i))
  const realUsers = members.filter((m) => !testUserIds.includes(m.user_id))

  // Sign up all 12 test users
  for (let i = 0; i < 12; i++) {
    const uid = testUserId(i)
    await adminQuery("game_signups", "POST", {
      game_id: gameId,
      user_id: uid,
      status: "confirmed",
    })
    console.log(`  ✅ Test user ${i + 1} signed up`)
  }

  // Sign up real users too
  for (const realUser of realUsers) {
    await adminQuery("game_signups", "POST", {
      game_id: gameId,
      user_id: realUser.user_id,
      status: "confirmed",
    })
    console.log(`  ✅ Real user ${realUser.user_id} signed up`)
  }

  console.log(`\n🎉 Done! All players signed up for game ${gameId}`)
  console.log(`   Open the game page and click "Generate Teams" to continue.`)
}

main().catch((err) => {
  console.error("❌ Error:", err.message)
  process.exit(1)
})
