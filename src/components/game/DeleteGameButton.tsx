"use client"

// @file src/components/game/DeleteGameButton.tsx
// @description Button to delete a game — only shown to the game creator
// @depends app/group/[id]/games/[gameId]/actions

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { deleteGame } from "@/app/group/[id]/games/[gameId]/actions"

export function DeleteGameButton({
  gameId,
  groupId,
}: {
  gameId: string
  groupId: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    const result = await deleteGame(gameId, groupId)

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      setConfirming(false)
      return
    }

    toast.success("Jogo eliminado")
    router.push(`/group/${groupId}/games`)
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <Button
          onClick={handleDelete}
          disabled={loading}
          className="flex-1 h-10 bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium"
        >
          {loading ? "A eliminar..." : "Sim, eliminar"}
        </Button>
        <Button
          onClick={() => setConfirming(false)}
          variant="ghost"
          className="flex-1 h-10 text-muted-foreground"
        >
          Cancelar
        </Button>
      </div>
    )
  }

  return (
    <Button
      onClick={() => setConfirming(true)}
      variant="ghost"
      className="w-full h-10 text-red-400 hover:bg-red-500/10 border border-white/10"
    >
      <Trash2 className="size-4 mr-2" />
      Eliminar Jogo
    </Button>
  )
}
