"use client"

// @file src/components/payment/PaymentList.tsx
// @description Payment list — only tab picker can toggle paid, all-paid games collapse
// @depends lib/supabase/client

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Check, Clock, Phone, ChevronDown, Copy } from "lucide-react"
import { toast } from "sonner"

// --- Types ---

type PaymentRow = {
  id: string
  game_id: string
  user_id: string
  amount: number
  paid: boolean
  paid_at: string | null
  profile: { display_name: string } | null
  game: { date: string; time: string } | null
}

// --- Component ---

function formatPhone(phone: string) {
  const cleaned = phone.replace(/\s/g, "")
  if (cleaned.startsWith("+351") && cleaned.length === 13) {
    return `+351 ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)} ${cleaned.slice(10)}`
  }
  // Generic: groups of 3 after country code
  if (cleaned.startsWith("+") && cleaned.length > 4) {
    const cc = cleaned.slice(0, 4)
    const rest = cleaned.slice(4)
    return `${cc} ${rest.replace(/(\d{3})(?=\d)/g, "$1 ")}`
  }
  return phone
}

export function PaymentList({
  payments,
  currentUserId,
  paidByMap,
  payerInfoMap,
}: {
  payments: PaymentRow[]
  currentUserId: string
  paidByMap: Record<string, string>
  payerInfoMap: Record<string, { name: string; phone: string }>
}) {
  const router = useRouter()
  const supabase = createClient()
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set())

  async function togglePaid(paymentId: string, currentlyPaid: boolean) {
    await supabase
      .from("payments")
      .update({
        paid: !currentlyPaid,
        paid_at: !currentlyPaid ? new Date().toISOString() : null,
      })
      .eq("id", paymentId)

    router.refresh()
  }

  if (payments.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-muted-foreground">Ainda sem pagamentos</p>
      </div>
    )
  }

  // Group by game
  const byGame = payments.reduce(
    (acc, p) => {
      if (!acc[p.game_id]) acc[p.game_id] = []
      acc[p.game_id].push(p)
      return acc
    },
    {} as Record<string, PaymentRow[]>
  )

  function toggleExpand(gameId: string) {
    setExpandedGames((prev) => {
      const next = new Set(prev)
      if (next.has(gameId)) next.delete(gameId)
      else next.add(gameId)
      return next
    })
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text.replace(/\s/g, ""))
    toast.success("Número copiado!")
  }

  return (
    <div className="space-y-4">
      {Object.entries(byGame).map(([gameId, gamePayments]) => {
        const game = gamePayments[0]?.game
        const totalPaid = gamePayments.filter((p) => p.paid).length
        const total = gamePayments.length
        const allPaid = totalPaid === total
        const isExpanded = expandedGames.has(gameId)
        const isTabPicker = paidByMap[gameId] === currentUserId

        return (
          <div key={gameId} className="glass rounded-xl p-4">
            <button
              onClick={() => allPaid && toggleExpand(gameId)}
              className={`flex items-center justify-between w-full ${allPaid ? "" : "cursor-default"} ${!allPaid ? "mb-3" : ""}`}
            >
              <p className="text-sm font-medium">
                {game ? `Jogo às ${game.time}` : "Jogo"}
              </p>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${allPaid ? "text-green-400" : "text-muted-foreground"}`}>
                  {totalPaid}/{total} pago
                </span>
                {allPaid && (
                  <ChevronDown
                    className={`size-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                )}
              </div>
            </button>

            {/* --- MB Way contact for open tabs --- */}
            {payerInfoMap[gameId] && (
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
                <Phone className="size-4 text-electric shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {isTabPicker
                      ? `Pagaste — o teu número MB Way`
                      : `Envia por MB Way para ${payerInfoMap[gameId].name}`}
                  </p>
                  <p className="text-lg font-[family-name:var(--font-heading)] text-electric tracking-wider">
                    {formatPhone(payerInfoMap[gameId].phone)}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(payerInfoMap[gameId].phone)}
                  className="size-8 rounded-lg glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <Copy className="size-4" />
                </button>
              </div>
            )}

            {(!allPaid || isExpanded) && (
              <div className={`space-y-2 ${allPaid ? "mt-3" : ""}`}>
                {gamePayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{payment.profile?.display_name ?? "Unknown"}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        €{payment.amount.toFixed(2)}
                      </span>
                      {isTabPicker ? (
                        <button
                          onClick={() => togglePaid(payment.id, payment.paid)}
                          className={`size-7 rounded-lg flex items-center justify-center transition-colors ${
                            payment.paid
                              ? "bg-green-500/20 text-green-400"
                              : "bg-white/5 text-muted-foreground hover:bg-white/10"
                          }`}
                        >
                          {payment.paid ? (
                            <Check className="size-4" />
                          ) : (
                            <Clock className="size-4" />
                          )}
                        </button>
                      ) : (
                        <div
                          className={`size-7 rounded-lg flex items-center justify-center ${
                            payment.paid
                              ? "bg-green-500/20 text-green-400"
                              : "bg-white/5 text-muted-foreground"
                          }`}
                        >
                          {payment.paid ? (
                            <Check className="size-4" />
                          ) : (
                            <Clock className="size-4" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
