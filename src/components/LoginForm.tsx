"use client"

// @file src/components/LoginForm.tsx
// @description Phone OTP login form — validates phone against member list, then sends OTP
// @depends lib/supabase/client, app/auth/actions

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Phone } from "lucide-react"
import { checkPhoneExists } from "@/app/auth/actions"

// --- Types ---

type Step = "phone" | "otp"

// --- Component ---

export function LoginForm() {
  const [step, setStep] = useState<Step>("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const fullPhone = `+351${phone.replace(/\s/g, "")}`

  async function handleSendOtp() {
    const digits = phone.replace(/\s/g, "")
    if (digits.length < 9) {
      toast.error("Introduz um número de telefone válido")
      return
    }

    setLoading(true)

    // Check if phone belongs to a registered member
    const { exists } = await checkPhoneExists(fullPhone)
    if (!exists) {
      toast.error("Este número não está registado. Pede ao admin do grupo para te adicionar.")
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: fullPhone,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success("Código enviado!")
    setStep("otp")
    setLoading(false)
  }

  async function handleVerifyOtp() {
    if (otp.length < 6) {
      toast.error("Introduz o código de 6 dígitos")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp,
      type: "sms",
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success("Bem-vindo!")
    router.refresh()
  }

  if (step === "otp") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Introduz o código enviado para {fullPhone}
        </p>
        <Input
          type="text"
          inputMode="numeric"
          placeholder="000000"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          className="h-12 text-center text-2xl tracking-[0.5em] bg-white/5 border-white/10 font-[family-name:var(--font-heading)]"
          autoFocus
        />
        <Button
          onClick={handleVerifyOtp}
          disabled={loading || otp.length < 6}
          className="w-full h-12 gradient-gold text-black font-bold text-base hover:opacity-90"
        >
          {loading ? "A verificar..." : "Verificar"}
        </Button>
        <button
          onClick={() => { setStep("phone"); setOtp("") }}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Usar outro número
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 h-12 px-3 rounded-md border border-white/10 bg-white/5 text-muted-foreground text-base shrink-0">
          <Phone className="size-4" />
          <span>+351</span>
        </div>
        <Input
          type="tel"
          inputMode="numeric"
          placeholder="912 345 678"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
          className="h-12 text-base bg-white/5 border-white/10 flex-1"
          autoFocus
        />
      </div>
      <Button
        onClick={handleSendOtp}
        disabled={loading}
        className="w-full h-12 gradient-gold text-black font-bold text-base hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
      >
        <Phone className="size-5" />
        {loading ? "A enviar..." : "Enviar código de verificação"}
      </Button>
    </div>
  )
}
