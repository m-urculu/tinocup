"use client"

// @file src/app/profile/setup/ProfileSetupForm.tsx
// @description First-time profile creation form (client component)
// @depends lib/supabase/client

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function ProfileSetupForm() {
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) return

    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast.error("Não autenticado")
      setLoading(false)
      return
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      phone: user.phone!,
      display_name: displayName.trim(),
    })

    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }

    router.push("/group/new")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-heading)] text-4xl tracking-wider text-gold">
            BEM-VINDO
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Configura o teu perfil de jogador
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
          <label className="text-sm font-medium text-muted-foreground">
            Nome
          </label>
          <Input
            type="text"
            placeholder="O teu nome"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={30}
            className="h-12 bg-white/5 border-white/10 text-lg"
          />
          <Button
            type="submit"
            disabled={loading || !displayName.trim()}
            className="w-full h-12 gradient-gold text-black font-bold text-base hover:opacity-90 transition-opacity"
          >
            {loading ? "A guardar..." : "Continuar"}
          </Button>
        </form>
      </div>
    </div>
  )
}
