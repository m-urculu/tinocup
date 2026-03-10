"use client"

// @file src/app/group/new/NewGroupForm.tsx
// @description Create or join a group form (client component)
// @depends lib/supabase/client

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Users, Plus } from "lucide-react"

export default function NewGroupForm() {
  const [tab, setTab] = useState<"create" | "join">("create")
  const [groupName, setGroupName] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!groupName.trim()) return

    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast.error("Não autenticado")
      setLoading(false)
      return
    }

    // Generate 6-char invite code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data: group, error } = await supabase
      .from("groups")
      .insert({ name: groupName.trim(), invite_code: code, created_by: user.id })
      .select()
      .single()

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // Add creator as admin
    await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: user.id,
      role: "admin",
    })

    // Initialize player rating
    await supabase.from("player_ratings").insert({
      user_id: user.id,
      group_id: group.id,
    })

    setLoading(false)
    router.push(`/group/${group.id}`)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteCode.trim()) return

    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast.error("Não autenticado")
      setLoading(false)
      return
    }

    const { data: group, error } = await supabase
      .from("groups")
      .select()
      .eq("invite_code", inviteCode.trim().toUpperCase())
      .single()

    if (error || !group) {
      toast.error("Código de convite inválido")
      setLoading(false)
      return
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("group_members")
      .select()
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .single()

    if (existing) {
      router.push(`/group/${group.id}`)
      return
    }

    await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: user.id,
      role: "member",
    })

    // Initialize player rating
    await supabase.from("player_ratings").insert({
      user_id: user.id,
      group_id: group.id,
    })

    setLoading(false)
    router.push(`/group/${group.id}`)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-heading)] text-5xl tracking-wider text-gold">
            TINOCUP
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Criar ou entrar num grupo
          </p>
        </div>

        {/* --- Tab Switcher --- */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("create")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "create"
                ? "gradient-gold text-black"
                : "glass text-muted-foreground"
            }`}
          >
            <Plus className="inline size-4 mr-1" />
            Criar
          </button>
          <button
            onClick={() => setTab("join")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "join"
                ? "gradient-gold text-black"
                : "glass text-muted-foreground"
            }`}
          >
            <Users className="inline size-4 mr-1" />
            Entrar
          </button>
        </div>

        {/* --- Forms --- */}
        <div className="glass rounded-2xl p-6">
          {tab === "create" ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <label className="text-sm font-medium text-muted-foreground">
                Nome do grupo
              </label>
              <Input
                type="text"
                placeholder="ex. Futebol de Quinta"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={40}
                className="h-12 bg-white/5 border-white/10 text-lg"
              />
              <Button
                type="submit"
                disabled={loading || !groupName.trim()}
                className="w-full h-12 gradient-gold text-black font-bold text-base hover:opacity-90 transition-opacity"
              >
                {loading ? "A criar..." : "Criar Grupo"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <label className="text-sm font-medium text-muted-foreground">
                Código de convite
              </label>
              <Input
                type="text"
                placeholder="ABC123"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="h-12 bg-white/5 border-white/10 text-center text-2xl tracking-[0.3em] uppercase"
              />
              <Button
                type="submit"
                disabled={loading || !inviteCode.trim()}
                className="w-full h-12 gradient-gold text-black font-bold text-base hover:opacity-90 transition-opacity"
              >
                {loading ? "A entrar..." : "Entrar no Grupo"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
