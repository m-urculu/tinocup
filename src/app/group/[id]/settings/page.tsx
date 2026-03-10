"use client"

// @file src/app/group/[id]/settings/page.tsx
// @description Group settings — avatar upload, phone number, members list, sign out
// @depends lib/supabase/client

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { LogOut, Crown, Users, Phone, Check, Camera, User } from "lucide-react"
import Image from "next/image"

// --- Types ---

type MemberRow = {
  id: string
  user_id: string
  role: string
  profile: { display_name: string; phone: string; avatar_url: string | null } | null
}

// --- Component ---

export default function SettingsPage() {
  const params = useParams<{ id: string }>()
  const groupId = params.id
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [members, setMembers] = useState<MemberRow[]>([])
  const [phone, setPhone] = useState("")
  const [savedPhone, setSavedPhone] = useState("")
  const [savingPhone, setSavingPhone] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [savedName, setSavedName] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      // Load members
      const { data: m } = await supabase
        .from("group_members")
        .select("*, profile:profiles(display_name, phone, avatar_url)")
        .eq("group_id", groupId)
        .order("joined_at")
      if (m) setMembers(m as MemberRow[])

      // Load current user's profile
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone, avatar_url, display_name")
          .eq("id", user.id)
          .single()
        if (profile?.phone) {
          setPhone(profile.phone)
          setSavedPhone(profile.phone)
        }
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
        if (profile?.display_name) {
          setDisplayName(profile.display_name)
          setSavedName(profile.display_name)
        }
      }
    }
    load()
  }, [groupId, supabase])

  // --- Handlers ---

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    if (!file.type.startsWith("image/")) {
      toast.error("Seleciona um ficheiro de imagem")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter menos de 2MB")
      return
    }

    setUploadingAvatar(true)

    const ext = file.name.split(".").pop() ?? "jpg"
    const filePath = `${userId}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      toast.error(uploadError.message)
      setUploadingAvatar(false)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath)

    // Add cache-buster to force refresh
    const newUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: newUrl })
      .eq("id", userId)

    if (updateError) {
      toast.error(updateError.message)
    } else {
      setAvatarUrl(newUrl)
      // Update member list locally
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === userId && m.profile
            ? { ...m, profile: { ...m.profile, avatar_url: newUrl } }
            : m
        )
      )
      toast.success("Foto atualizada!")
    }
    setUploadingAvatar(false)
  }

  async function handleSaveName() {
    if (!displayName.trim()) return
    setSavingName(true)

    if (!userId) {
      toast.error("Não autenticado")
      setSavingName(false)
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", userId)

    if (error) {
      toast.error(error.message)
    } else {
      setSavedName(displayName.trim())
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === userId && m.profile
            ? { ...m, profile: { ...m.profile, display_name: displayName.trim() } }
            : m
        )
      )
      toast.success("Nome guardado")
    }
    setSavingName(false)
  }

  async function handleSavePhone() {
    if (!phone.trim()) return
    setSavingPhone(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast.error("Não autenticado")
      setSavingPhone(false)
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({ phone: phone.trim() })
      .eq("id", user.id)

    if (error) {
      toast.error(error.message)
    } else {
      setSavedPhone(phone.trim())
      toast.success("Número guardado")
    }
    setSavingPhone(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/")
  }

  // --- Helpers ---

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Definições</h2>

      {/* --- Avatar --- */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Camera className="size-4 text-electric" />
          <h3 className="text-sm font-semibold">Foto de Perfil</h3>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative size-20 rounded-full overflow-hidden border-2 border-white/20 hover:border-gold transition-colors shrink-0 group"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Avatar"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center text-xl font-bold text-muted-foreground">
                {displayName ? getInitials(displayName) : "?"}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="size-5 text-white" />
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
          <div className="text-sm text-muted-foreground">
            <p>Toca para mudar a foto</p>
            <p className="text-xs mt-1">JPG, PNG ou WebP, máx 2MB</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAvatarUpload}
          className="hidden"
        />
      </div>

      {/* --- Display Name --- */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="size-4 text-electric" />
          <h3 className="text-sm font-semibold">Nome</h3>
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="O teu nome"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-10 bg-white/5 border-white/10 flex-1"
          />
          <Button
            onClick={handleSaveName}
            disabled={savingName || displayName.trim() === savedName}
            className="h-10 gradient-gold text-black font-bold hover:opacity-90"
          >
            {savingName ? "..." : <Check className="size-4" />}
          </Button>
        </div>
      </div>

      {/* --- Phone Number (MB Way) --- */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Phone className="size-4 text-electric" />
          <h3 className="text-sm font-semibold">Número de Telefone</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Usado para pagamentos MB Way. Os outros membros vão ver este número quando te devem dinheiro.
        </p>
        <div className="flex gap-2">
          <Input
            type="tel"
            placeholder="+351 9XX XXX XXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10 bg-white/5 border-white/10 flex-1"
          />
          <Button
            onClick={handleSavePhone}
            disabled={savingPhone || phone.trim() === savedPhone}
            className="h-10 gradient-gold text-black font-bold hover:opacity-90"
          >
            {savingPhone ? "..." : <Check className="size-4" />}
          </Button>
        </div>
      </div>

      {/* --- Members --- */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="size-4 text-electric" />
          <h3 className="text-sm font-semibold">
            Membros ({members.length})
          </h3>
        </div>
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between text-sm py-1.5"
            >
              <div className="flex items-center gap-2">
                <div className="relative size-7 rounded-full overflow-hidden shrink-0">
                  {m.profile?.avatar_url ? (
                    <Image
                      src={m.profile.avatar_url}
                      alt={m.profile?.display_name ?? ""}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      {m.profile?.display_name
                        ? getInitials(m.profile.display_name)
                        : "?"}
                    </div>
                  )}
                </div>
                <span>{m.profile?.display_name ?? "Unknown"}</span>
              </div>
              {m.role === "admin" && (
                <Crown className="size-4 text-gold" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* --- Actions --- */}
      <Button
        onClick={handleLogout}
        variant="ghost"
        className="w-full h-11 text-muted-foreground hover:bg-white/5 border border-white/10"
      >
        <LogOut className="size-4 mr-2" />
        Terminar Sessão
      </Button>
    </div>
  )
}
