// @file scripts/setup-avatar-bucket.ts
// @description Creates the 'avatars' storage bucket and sets up RLS policies
//   Run with: SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ACCESS_TOKEN=... npx tsx scripts/setup-avatar-bucket.ts

const SUPABASE_URL = "https://hnzevidrpwljcrvymyed.supabase.co"
const PROJECT_REF = "hnzevidrpwljcrvymyed"
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!SRK) { console.error("❌ Set SUPABASE_SERVICE_ROLE_KEY"); process.exit(1) }
if (!ACCESS_TOKEN) { console.error("❌ Set SUPABASE_ACCESS_TOKEN"); process.exit(1) }

async function main() {
  // 1. Create the bucket (public so avatar URLs work without auth)
  console.log("Creating 'avatars' bucket...")
  const bucketRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: SRK!,
      Authorization: `Bearer ${SRK}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: "avatars",
      name: "avatars",
      public: true,
      file_size_limit: 2 * 1024 * 1024, // 2MB
      allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
    }),
  })
  const bucketData = await bucketRes.json()
  if (bucketRes.ok) {
    console.log("✅ Bucket created")
  } else if (bucketData.message?.includes("already exists")) {
    console.log("⚠️  Bucket already exists, skipping")
  } else {
    console.error("❌ Bucket creation failed:", bucketData)
    process.exit(1)
  }

  // 2. Create RLS policies via Management API SQL endpoint
  console.log("Setting up storage policies...")

  const policies = [
    {
      name: "avatars_public_read",
      sql: `CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');`,
    },
    {
      name: "avatars_auth_insert",
      sql: `CREATE POLICY "avatars_auth_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);`,
    },
    {
      name: "avatars_auth_update",
      sql: `CREATE POLICY "avatars_auth_update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);`,
    },
    {
      name: "avatars_auth_delete",
      sql: `CREATE POLICY "avatars_auth_delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);`,
    },
  ]

  for (const policy of policies) {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: policy.sql }),
      }
    )

    if (res.ok) {
      console.log(`  ✅ Policy "${policy.name}" created`)
    } else {
      const err = await res.text()
      if (err.includes("already exists")) {
        console.log(`  ⚠️  Policy "${policy.name}" already exists`)
      } else {
        console.error(`  ❌ Policy "${policy.name}" failed:`, err)
      }
    }
  }

  console.log("\n✅ Avatar storage setup complete!")
}

main()
