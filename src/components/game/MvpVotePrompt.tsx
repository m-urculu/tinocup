"use client"

// @file src/components/game/MvpVotePrompt.tsx
// @description Floating banner + dialog for casting MVP votes after completed games.
// @depends components/ui/dialog, app/group/[slug]/games/[gameId]/actions

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Trophy } from "lucide-react"
import { toast } from "sonner"
import { castMvpVoteAction } from "@/app/group/[slug]/games/[gameId]/actions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

// --- Types ---

type Player = {
  userId: string
  displayName: string
  avatarUrl: string | null
}

type PendingMvpGame = {
  gameId: string
  date: string
  players: Player[]
}

type MvpVotePromptProps = {
  groupSlug: string
  pendingGame: PendingMvpGame
}

// --- Component ---

export function MvpVotePrompt({ groupSlug, pendingGame }: MvpVotePromptProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const formattedDate = new Date(pendingGame.date).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
  })

  function handleVote() {
    if (!selected) return
    startTransition(async () => {
      const result = await castMvpVoteAction(
        pendingGame.gameId,
        groupSlug,
        selected
      )
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Voto registado!")
        setOpen(false)
        setSelected(null)
        router.refresh()
      }
    })
  }

  return (
    <>
      {/* --- Floating Banner --- */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-16 left-0 right-0 z-49 mx-auto max-w-lg px-4"
      >
        <div className="flex items-center gap-3 rounded-xl border border-gold-light/40 px-4 py-3"
          style={{
            background: "linear-gradient(135deg, #d4af37 0%, #f0d060 40%, #d4af37 60%, #a88a2a 100%)",
            boxShadow: "0 4px 16px rgba(139, 101, 26, 0.5), 0 1px 3px rgba(139, 101, 26, 0.3), inset 0 1px 0 rgba(240, 208, 96, 0.4)",
          }}>
          <Trophy className="size-5 text-black/80 shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-black/80">Votar MVP</p>
            <p className="text-xs text-black/50">
              Jogo de {formattedDate}
            </p>
          </div>
          <span className="text-xs text-black/50">Toca para votar →</span>
        </div>
      </button>

      {/* --- Vote Dialog --- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0d1225]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="size-5 text-gold" />
              MVP do Jogo — {formattedDate}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Quem foi o melhor jogador?
          </p>

          {/* --- Player Grid --- */}
          <div className="grid grid-cols-3 gap-3 py-2">
            {pendingGame.players.map((player) => {
              const isSelected = selected === player.userId
              const initials = player.displayName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)

              return (
                <button
                  key={player.userId}
                  onClick={() => setSelected(player.userId)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all ${
                    isSelected
                      ? "bg-gold/20 ring-2 ring-gold"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div
                    className={`relative size-12 rounded-full overflow-hidden border-2 transition-colors ${
                      isSelected ? "border-gold" : "border-white/10"
                    }`}
                  >
                    {player.avatarUrl ? (
                      <Image
                        src={player.avatarUrl}
                        alt={player.displayName}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-white/10 flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {initials}
                      </div>
                    )}
                  </div>
                  <span className="text-xs truncate max-w-full">
                    {player.displayName.split(" ")[0]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* --- Vote Button --- */}
          <Button
            onClick={handleVote}
            disabled={!selected || isPending}
            className="w-full gradient-gold text-black font-bold"
          >
            {isPending ? "A votar..." : "Votar"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

export type { PendingMvpGame }
