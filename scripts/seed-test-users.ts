// @file scripts/seed-test-users.ts
// @description Seeds 28 synthetic test users (fake names/phones), profiles, group membership, and player ratings.
//   Everyone starts at rating 1000. Shadow rating reflects prior skill knowledge.
//   The group owner is excluded — that account already exists.
//   Run with: npx tsx scripts/seed-test-users.ts [groupId]

// --- Config ---

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hnzevidrpwljcrvymyed.supabase.co"
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Set SUPABASE_SERVICE_ROLE_KEY env var first")
  process.exit(1)
}

// --- Members (28 synthetic test users; the group owner already exists) ---
// Shadow ratings: Top ~1130-1190, Mid ~990-1070, Low ~910-940
// Names and phone numbers are fake (the +351 90x range is not assigned to mobile carriers).

const TEST_USERS = [
  // --- Top tier ---
  { name: "Player 01", phone: "+351900000001", shadow: 1190 },
  { name: "Player 02", phone: "+351900000002", shadow: 1180 },
  { name: "Player 03", phone: "+351900000003", shadow: 1170 },
  { name: "Player 04", phone: "+351900000004", shadow: 1160 },
  { name: "Player 05", phone: "+351900000005", shadow: 1150 },
  { name: "Player 06", phone: "+351900000006", shadow: 1140 },
  { name: "Player 07", phone: "+351900000007", shadow: 1130 },
  // --- Mid tier ---
  { name: "Player 08", phone: "+351900000008", shadow: 1070 },
  { name: "Player 09", phone: "+351900000009", shadow: 1065 },
  { name: "Player 10", phone: "+351900000010", shadow: 1060 },
  { name: "Player 11", phone: "+351900000011", shadow: 1055 },
  { name: "Player 12", phone: "+351900000012", shadow: 1050 },
  { name: "Player 13", phone: "+351900000013", shadow: 1045 },
  { name: "Player 14", phone: "+351900000014", shadow: 1040 },
  { name: "Player 15", phone: "+351900000015", shadow: 1035 },
  { name: "Player 16", phone: "+351900000016", shadow: 1030 },
  { name: "Player 17", phone: "+351900000017", shadow: 1025 },
  { name: "Player 18", phone: "+351900000018", shadow: 1020 },
  { name: "Player 19", phone: "+351900000019", shadow: 1015 },
  { name: "Player 20", phone: "+351900000020", shadow: 1010 },
  { name: "Player 21", phone: "+351900000021", shadow: 1005 },
  { name: "Player 22", phone: "+351900000022", shadow: 1000 },
  { name: "Player 23", phone: "+351900000023", shadow: 1000 },
  { name: "Player 24", phone: "+351900000024", shadow: 995 },
  { name: "Player 25", phone: "+351900000025", shadow: 990 },
  // --- Low tier ---
  { name: "Player 26", phone: "+351900000026", shadow: 940 },
  { name: "Player 27", phone: "+351900000027", shadow: 920 },
  { name: "Player 28", phone: "+351900000028", shadow: 910 },
]

function userId(index: number): string {
  return `10000000-0000-0000-0000-00000000${String(index + 1).padStart(4, "0")}`
}

// --- Helpers ---

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
  if (!res.ok) {
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

async function createAuthUser(id: string, phone: string): Promise<void> {
  const url = `${SUPABASE_URL}/auth/v1/admin/users`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ id, phone, phone_confirm: true }),
  })
  if (!res.ok) {
    const text = await res.text()
    if (text.includes("already") || text.includes("duplicate")) {
      return
    }
    throw new Error(`Create auth user failed: ${res.status} ${text}`)
  }
}

// --- Main ---

async function main() {
  let groupId = process.argv[2]

  if (!groupId) {
    const groups = (await adminSelect("groups", "select=id&limit=1")) as { id: string }[]
    if (groups.length === 0) {
      console.error("❌ No groups found. Create a group first.")
      process.exit(1)
    }
    groupId = groups[0].id
  }

  console.log(`\n🏟️  Seeding ${TEST_USERS.length} members into group ${groupId}\n`)

  for (let i = 0; i < TEST_USERS.length; i++) {
    const user = TEST_USERS[i]
    const id = userId(i)

    await createAuthUser(id, user.phone)
    await adminQuery("profiles", "POST", { id, phone: user.phone, display_name: user.name })
    await adminQuery("group_members", "POST", { group_id: groupId, user_id: id, role: "member" })
    await adminQuery("player_ratings", "POST", {
      user_id: id, group_id: groupId,
      rating: 1000,
      shadow_rating: user.shadow,
      games_played: 0, wins: 0, draws: 0, losses: 0, goals: 0,
    })

    console.log(`  ✅ ${user.name.padEnd(18)} ${user.phone}  shadow: ${user.shadow}`)
  }

  console.log(`\n🎉 Done! ${TEST_USERS.length} synthetic members seeded.`)
}

main().catch((err) => {
  console.error("❌ Error:", err.message)
  process.exit(1)
})
