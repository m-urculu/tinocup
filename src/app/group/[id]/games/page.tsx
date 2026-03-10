// @file src/app/group/[id]/games/page.tsx
// @description All games list — upcoming and past with status badges
// @depends lib/supabase/server

import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Plus } from "lucide-react"

const statusColors: Record<string, string> = {
  upcoming: "bg-electric/20 text-electric",
  teams_set: "bg-gold/20 text-gold",
  in_progress: "bg-green-500/20 text-green-400",
  completed: "bg-white/10 text-muted-foreground",
  cancelled: "bg-red-500/20 text-red-400",
}

const statusLabels: Record<string, string> = {
  upcoming: "Agendado",
  teams_set: "Equipas Feitas",
  in_progress: "A Decorrer",
  completed: "Concluído",
  cancelled: "Cancelado",
}

export default async function GamesListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("group_id", id)
    .order("date", { ascending: false })

  // Fetch field names separately (avoids RLS issues on joins)
  const fieldIds = [
    ...new Set(
      (games ?? [])
        .map((g) => g.field_id)
        .filter((id): id is string => !!id)
    ),
  ]
  let fieldMap: Record<string, string> = {}
  if (fieldIds.length > 0) {
    const { data: fields } = await supabase
      .from("fields")
      .select("id, name")
      .in("id", fieldIds)
    if (fields) {
      fieldMap = Object.fromEntries(fields.map((f) => [f.id, f.name]))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Jogos</h2>
        <Link
          href={`/group/${id}/games/new`}
          className="flex items-center gap-1 rounded-lg gradient-gold px-3 py-1.5 text-base font-bold text-black hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" />
          Novo
        </Link>
      </div>

      {!games || games.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-muted-foreground">Ainda sem jogos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/group/${id}/games/${game.id}`}
              className="glass rounded-xl p-4 block hover:bg-white/[0.08] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium">
                    {new Date(game.date).toLocaleDateString("pt-PT", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    {" · "}
                    {game.time}
                  </p>
                  {game.field_id && fieldMap[game.field_id] && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {fieldMap[game.field_id]}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {game.status === "completed" &&
                    game.score_home !== null &&
                    game.score_away !== null && (
                      <span className="font-[family-name:var(--font-heading)] text-2xl text-foreground">
                        {game.score_home} - {game.score_away}
                      </span>
                    )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      statusColors[game.status] ?? ""
                    }`}
                  >
                    {statusLabels[game.status] ?? game.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
