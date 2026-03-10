"use client"

// @file src/components/game/SignupPanel.tsx
// @description Game signup panel — confirm/decline attendance, phone prompt, generate teams
// @depends app/group/[slug]/games/[gameId]/actions

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Check, X, Shuffle, Phone } from "lucide-react"
import {
  signupForGame,
  generateTeamsAction,
  updatePhoneAndSignup,
} from "@/app/group/[slug]/games/[gameId]/actions"

// --- Types ---

type Signup = {
  id: string
  user_id: string
  status: string
  profile: { display_name: string } | null
}

// --- Component ---

export function SignupPanel({
  gameId,
  groupSlug,
  userId,
  userSignup,
  confirmed,
  teamSize,
  userPhone,
  gameStatus,
}: {
  gameId: string
  groupSlug: string
  userId: string
  userSignup: Signup | null
  confirmed: Signup[]
  teamSize: number
  userPhone: string | null
  gameStatus: string
}) {
  const [loading, setLoading] = useState(false)
  const [showPhoneInput, setShowPhoneInput] = useState(false)
  const [phone, setPhone] = useState("")
  const router = useRouter()
  const totalNeeded = teamSize * 2
  const isFull = confirmed.length >= totalNeeded
  const isConfirmed = userSignup?.status === "confirmed"

  async function handleSignup(status: "confirmed" | "declined") {
    if (status === "confirmed" && isFull && !isConfirmed) {
      toast.error("Jogo cheio!")
      return
    }

    if (status === "confirmed" && !userPhone) {
      setShowPhoneInput(true)
      return
    }

    setLoading(true)
    const result = await signupForGame(gameId, groupSlug, status)

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success(status === "confirmed" ? "Estás dentro!" : "Marcado como indisponível")
    setLoading(false)
    router.refresh()
  }

  async function handlePhoneSubmit() {
    if (!phone.trim()) {
      toast.error("Introduz o teu número de telefone")
      return
    }

    setLoading(true)
    const result = await updatePhoneAndSignup(gameId, groupSlug, phone.trim())

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success("Estás dentro!")
    setShowPhoneInput(false)
    setLoading(false)
    router.refresh()
  }

  async function handleGenerateTeams() {
    setLoading(true)
    const result = await generateTeamsAction(gameId, groupSlug)

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success("Equipas geradas!")
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Inscrição ({confirmed.length}/{totalNeeded})
        </h3>
        {confirmed.length >= totalNeeded && gameStatus === "upcoming" && (
          <Button
            onClick={handleGenerateTeams}
            disabled={loading}
            size="sm"
            className="gradient-gold text-black font-bold text-xs hover:opacity-90"
          >
            <Shuffle className="size-3 mr-1" />
            Gerar Equipas
          </Button>
        )}
      </div>

      {/* --- Progress Bar --- */}
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full gradient-gold transition-all duration-500"
          style={{ width: `${Math.min((confirmed.length / totalNeeded) * 100, 100)}%` }}
        />
      </div>

      {/* --- Confirmed Players --- */}
      <div className="flex flex-wrap gap-2">
        {confirmed.map((s) => (
          <span
            key={s.id}
            className="text-xs px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 font-medium"
          >
            {s.profile?.display_name ?? "Unknown"}
          </span>
        ))}
      </div>

      {/* --- Phone Input (shown when user has no phone) --- */}
      {showPhoneInput && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="tel"
              placeholder="+351 912 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-9 h-10 bg-white/5 border-white/10"
            />
          </div>
          <Button
            onClick={handlePhoneSubmit}
            disabled={loading}
            className="h-10 gradient-gold text-black font-bold hover:opacity-90"
          >
            {loading ? "..." : "Confirmar"}
          </Button>
        </div>
      )}

      {/* --- User Actions --- */}
      {!showPhoneInput && (
        <div className="flex gap-2">
          <Button
            onClick={() => handleSignup("confirmed")}
            disabled={loading || isConfirmed || (isFull && !isConfirmed)}
            className={`flex-1 h-10 font-medium ${
              isConfirmed
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : isFull
                  ? "bg-white/5 text-muted-foreground"
                  : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
            }`}
          >
            <Check className="size-4 mr-1" />
            {isConfirmed ? "Confirmado" : isFull ? "Cheio" : "Estou dentro"}
          </Button>
          {(!isFull || isConfirmed) && (
            <Button
              onClick={() => handleSignup("declined")}
              disabled={loading || userSignup?.status === "declined"}
              variant="ghost"
              className="flex-1 h-10 text-red-400 hover:bg-red-500/10"
            >
              <X className="size-4 mr-1" />
              Não posso
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
