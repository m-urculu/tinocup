"use client"

// @file src/components/game/PaymentPanel.tsx
// @description Pick-up-the-tab form + payment summary on completed games
// @depends app/group/[id]/games/[gameId]/actions

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { CreditCard, Check, Clock, Phone } from "lucide-react"
import { pickUpTabAction } from "@/app/group/[id]/games/[gameId]/actions"

// --- Types ---

type PaymentRow = {
  id: string
  user_id: string
  amount: number
  paid: boolean
  profile: { display_name: string } | null
}

// --- Component ---

export function PaymentPanel({
  gameId,
  groupId,
  paidBy,
  paidByName,
  paidByPhone,
  totalCost,
  totalPlayers,
  payments,
  currentUserId,
}: {
  gameId: string
  groupId: string
  paidBy: string | null
  paidByName: string | null
  paidByPhone: string | null
  totalCost: number | null
  totalPlayers: number
  payments: PaymentRow[]
  currentUserId: string
}) {
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handlePickUpTab() {
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) {
      toast.error("Introduz um valor válido")
      return
    }

    setLoading(true)
    const result = await pickUpTabAction(gameId, groupId, parsed)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success("Conta registada!")
    router.refresh()
  }

  // No one picked up the tab yet — show the form
  if (!paidBy) {
    return (
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="size-4 text-electric" />
          <h3 className="text-sm font-semibold">Pagar a conta</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Pagaste o jogo? Introduz o total e os outros ficam a dever-te a parte deles.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              €
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 pl-7 bg-white/5 border-white/10"
            />
          </div>
          <Button
            onClick={handlePickUpTab}
            disabled={loading || !amount}
            className="h-10 gradient-gold text-black font-bold hover:opacity-90"
          >
            {loading ? "..." : "Eu paguei"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Dividido por {totalPlayers - 1} jogadores = €
          {amount && totalPlayers > 1 ? (parseFloat(amount) / (totalPlayers - 1)).toFixed(2) : "0.00"} each
        </p>
      </div>
    )
  }

  // Tab was picked up — show summary
  const perPlayer = totalCost && totalPlayers > 1
    ? Math.round((totalCost / (totalPlayers - 1)) * 100) / 100
    : 0
  const isPayer = currentUserId === paidBy

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="size-4 text-electric" />
        <h3 className="text-sm font-semibold">Pagamento</h3>
      </div>

      {/* --- Payer info --- */}
      <div className="flex items-center justify-between text-sm mb-3 pb-3 border-b border-white/10">
        <span className="text-muted-foreground">
          {isPayer ? "Tu" : paidByName} pagou
        </span>
        <span className="font-[family-name:var(--font-heading)] text-lg text-gold">
          €{totalCost?.toFixed(2)}
        </span>
      </div>

      {/* --- MB Way --- */}
      {!isPayer && paidByPhone && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
          <Phone className="size-4 text-electric" />
          <div>
            <p className="text-xs text-muted-foreground">
              Envia €{perPlayer.toFixed(2)} por MB Way para {paidByName}
            </p>
            <p className="text-sm font-[family-name:var(--font-heading)] text-electric">
              {paidByPhone}
            </p>
          </div>
        </div>
      )}

      {/* --- Player list --- */}
      <div className="space-y-2">
        {payments.map((p) => (
          <div key={p.id} className="flex items-center justify-between text-sm">
            <span>{p.profile?.display_name ?? "Unknown"}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                €{p.amount.toFixed(2)}
              </span>
              {isPayer ? (
                <button
                  onClick={async () => {
                    await supabase
                      .from("payments")
                      .update({
                        paid: !p.paid,
                        paid_at: !p.paid ? new Date().toISOString() : null,
                      })
                      .eq("id", p.id)
                    router.refresh()
                  }}
                  className={`size-7 rounded-lg flex items-center justify-center transition-colors ${
                    p.paid
                      ? "bg-green-500/20 text-green-400"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  {p.paid ? (
                    <Check className="size-4" />
                  ) : (
                    <Clock className="size-4" />
                  )}
                </button>
              ) : (
                <div
                  className={`size-6 rounded-md flex items-center justify-center ${
                    p.paid
                      ? "bg-green-500/20 text-green-400"
                      : "bg-white/5 text-muted-foreground"
                  }`}
                >
                  {p.paid ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Clock className="size-3.5" />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
