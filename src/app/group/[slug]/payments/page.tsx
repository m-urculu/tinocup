// @file src/app/group/[slug]/payments/page.tsx
// @description Payment tracker — per-game cost split, paid/unpaid status, MB Way
// @depends lib/supabase/server, components/payment/PaymentList

import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { PaymentList } from "@/components/payment/PaymentList"

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  // Resolve slug → UUID
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("slug", slug)
    .single()

  if (!group) notFound()
  const groupId = group.id

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch games in this group
  const { data: games } = await supabase
    .from("games")
    .select("id, paid_by")
    .eq("group_id", groupId)

  const gameIds = games?.map((g) => g.id) ?? []

  // Build a map of game_id → paid_by
  const paidByMap: Record<string, string> = {}
  for (const g of games ?? []) {
    if (g.paid_by) paidByMap[g.id] = g.paid_by
  }

  // Fetch payments
  const { data: groupPayments } = await supabase
    .from("payments")
    .select("*, profile:profiles(display_name), game:games(date, time)")
    .in("game_id", gameIds.length > 0 ? gameIds : ["none"])
    .order("created_at", { ascending: false })

  // Fetch payer profiles (name + phone) for each tab picker
  const paidByIds = [...new Set((games ?? []).map((g) => g.paid_by).filter((id): id is string => !!id))]
  const payerInfoMap: Record<string, { name: string; phone: string }> = {}
  if (paidByIds.length > 0) {
    const { data: payerProfiles } = await supabase
      .from("profiles")
      .select("id, display_name, phone")
      .in("id", paidByIds)
    if (payerProfiles) {
      const profileById = Object.fromEntries(payerProfiles.map((p) => [p.id, p]))
      for (const g of games ?? []) {
        if (g.paid_by && profileById[g.paid_by]) {
          const prof = profileById[g.paid_by]
          if (prof.phone) {
            payerInfoMap[g.id] = { name: prof.display_name ?? "Desconhecido", phone: prof.phone }
          }
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Pagamentos</h2>
      <PaymentList
        payments={groupPayments ?? []}
        currentUserId={user?.id ?? ""}
        paidByMap={paidByMap}
        payerInfoMap={payerInfoMap}
      />
    </div>
  )
}
