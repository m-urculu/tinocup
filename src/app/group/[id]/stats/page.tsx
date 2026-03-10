// @file src/app/group/[id]/stats/page.tsx
// @description Leaderboard + FUT-style player cards
// @depends lib/supabase/server, components/stats/PlayerCard

import { createClient } from "@/lib/supabase/server"
import { PlayerCardComponent } from "@/components/stats/PlayerCard"

export default async function StatsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ratings } = await supabase
    .from("player_ratings")
    .select("*, profile:profiles(*)")
    .eq("group_id", id)
    .order("rating", { ascending: false })

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Classificação</h2>

      {!ratings || ratings.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-muted-foreground">Ainda sem jogadores</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {ratings.map((rating, index) => {
            // Tied players share the same rank
            const rank =
              index === 0 || rating.rating !== ratings[index - 1].rating
                ? index + 1
                : ratings.findIndex((r) => r.rating === rating.rating) + 1
            return (
            <PlayerCardComponent
              key={rating.id}
              rank={rank}
              rating={rating.rating}
              displayName={
                (rating.profile as { display_name: string })?.display_name ??
                "Unknown"
              }
              avatarUrl={
                (rating.profile as { avatar_url: string | null })?.avatar_url
              }
              gamesPlayed={rating.games_played}
              wins={rating.wins}
              draws={rating.draws}
              losses={rating.losses}
              goals={rating.goals}
            />
            )
          })}
        </div>
      )}
    </div>
  )
}
