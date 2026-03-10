// @file src/app/group/[id]/page.tsx
// @description Group dashboard — upcoming games, quick stats
// @depends lib/supabase/server

import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Calendar, Users, Trophy, Plus, Target, TrendingUp, Swords } from "lucide-react"

export default async function GroupDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch upcoming games (no join — avoids RLS issues on fields)
  const { data: upcomingGames } = await supabase
    .from("games")
    .select("*")
    .eq("group_id", id)
    .in("status", ["upcoming", "teams_set"])
    .order("date", { ascending: true })
    .limit(3)

  // Fetch field names for upcoming games
  const fieldIds = [
    ...new Set(
      (upcomingGames ?? [])
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

  // Fetch member count
  const { count: memberCount } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", id)

  // Fetch user's rating in this group
  const { data: myRating } = await supabase
    .from("player_ratings")
    .select("*")
    .eq("group_id", id)
    .eq("user_id", user?.id ?? "")
    .single()

  return (
    <div className="space-y-6">
      {/* --- Quick Stats --- */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-3 text-center">
          <Users className="mx-auto mb-1 size-5 text-electric" />
          <p className="font-[family-name:var(--font-heading)] text-2xl text-foreground">
            {memberCount ?? 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Jogadores</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <Trophy className="mx-auto mb-1 size-5 text-gold" />
          <p className="font-[family-name:var(--font-heading)] text-2xl text-foreground">
            {myRating?.rating ?? 1000}
          </p>
          <p className="text-[10px] text-muted-foreground">Meu Rating</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <Calendar className="mx-auto mb-1 size-5 text-electric" />
          <p className="font-[family-name:var(--font-heading)] text-2xl text-foreground">
            {myRating?.games_played ?? 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Jogos</p>
        </div>
      </div>

      {/* --- My Stats Card --- */}
      {(() => {
        const wins = myRating?.wins ?? 0
        const draws = myRating?.draws ?? 0
        const losses = myRating?.losses ?? 0
        const goals = myRating?.goals ?? 0
        const gamesPlayed = myRating?.games_played ?? 0
        const total = wins + draws + losses || 1
        const winPct = Math.round((wins / total) * 100)
        const drawPct = Math.round((draws / total) * 100)
        const lossPct = 100 - winPct - drawPct
        return (
          <div className="glass rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-electric" />
              <h3 className="text-sm font-semibold">As Minhas Estatísticas</h3>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="font-[family-name:var(--font-heading)] text-xl text-green-400">{wins}</p>
                <p className="text-[10px] text-muted-foreground">Vitórias</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-heading)] text-xl text-yellow-400">{draws}</p>
                <p className="text-[10px] text-muted-foreground">Empates</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-heading)] text-xl text-red-400">{losses}</p>
                <p className="text-[10px] text-muted-foreground">Derrotas</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-heading)] text-xl text-electric">{goals}</p>
                <p className="text-[10px] text-muted-foreground">Golos</p>
              </div>
            </div>

            {/* W/D/L bar chart */}
            {gamesPlayed > 0 ? (
              <div className="space-y-1.5">
                <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
                  {winPct > 0 && (
                    <div
                      className="bg-green-500 transition-all"
                      style={{ width: `${winPct}%` }}
                    />
                  )}
                  {drawPct > 0 && (
                    <div
                      className="bg-yellow-500 transition-all"
                      style={{ width: `${drawPct}%` }}
                    />
                  )}
                  {lossPct > 0 && (
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: `${lossPct}%` }}
                    />
                  )}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{winPct}% vit.</span>
                  <span>{drawPct}% emp.</span>
                  <span>{lossPct}% der.</span>
                </div>
              </div>
            ) : (
              <div className="h-3 rounded-full bg-white/5" />
            )}

            {/* Goals per game */}
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-white/5 pt-3">
              <div className="flex items-center gap-1.5">
                <Target className="size-3.5" />
                <span>Golos por jogo</span>
              </div>
              <span className="font-medium text-foreground">
                {gamesPlayed > 0 ? (goals / gamesPlayed).toFixed(1) : "—"}
              </span>
            </div>
          </div>
        )
      })()}

      {/* --- New Game Button --- */}
      <Link
        href={`/group/${id}/games/new`}
        className="flex items-center justify-center gap-2 w-full h-12 rounded-xl gradient-gold text-black font-bold text-base hover:opacity-90 transition-opacity"
      >
        <Plus className="size-5" />
        Novo Jogo
      </Link>

      {/* --- Upcoming Games --- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Próximos Jogos
          </h2>
          <Link
            href={`/group/${id}/games`}
            className="text-xs text-electric hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {!upcomingGames || upcomingGames.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Gamepad2Icon />
            <p className="mt-2 text-sm text-muted-foreground">
              Sem jogos agendados
            </p>
            <Link
              href={`/group/${id}/games/new`}
              className="mt-3 inline-block text-sm font-medium text-gold hover:underline"
            >
              Agendar um →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingGames.map((game) => (
              <Link
                key={game.id}
                href={`/group/${id}/games/${game.id}`}
                className="glass rounded-xl p-4 block hover:bg-white/[0.08] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(game.date).toLocaleDateString("pt-PT", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {game.time}
                    </p>
                    {game.field_id && fieldMap[game.field_id] && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fieldMap[game.field_id]}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gold/20 text-gold font-medium">
                      {game.team_size}v{game.team_size}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Gamepad2Icon() {
  return (
    <svg
      className="mx-auto size-8 text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z"
      />
    </svg>
  )
}
