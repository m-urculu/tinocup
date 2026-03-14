// @file src/app/group/[slug]/layout.tsx
// @description Group layout — fetches group by slug, checks pending MVP votes, wraps children with nav
// @depends lib/supabase/server, components/layout/GroupLayout

export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { GroupLayout } from "@/components/layout/GroupLayout"
import type { PendingMvpGame } from "@/components/game/MvpVotePrompt"

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("slug", slug)
    .single()

  if (!group) notFound()

  // --- Check for pending MVP votes ---
  let pendingMvpGame: PendingMvpGame | null = null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Find completed games in this group where user played but hasn't voted
    const { data: completedGames } = await supabase
      .from("games")
      .select("id, date")
      .eq("group_id", group.id)
      .eq("status", "completed")
      .order("date", { ascending: true })

    if (completedGames && completedGames.length > 0) {
      for (const game of completedGames) {
        // Check if user played in this game
        const { data: userTeam } = await supabase
          .from("game_teams")
          .select("user_id")
          .eq("game_id", game.id)
          .eq("user_id", user.id)
          .maybeSingle()

        if (!userTeam) continue

        // Check if user already voted
        const { data: existingVote } = await supabase
          .from("game_mvp_votes")
          .select("id")
          .eq("game_id", game.id)
          .eq("voter_id", user.id)
          .maybeSingle()

        if (existingVote) continue

        // Found an unvoted game — fetch players (excluding self)
        const { data: teams } = await supabase
          .from("game_teams")
          .select("user_id, profile:profiles(display_name, avatar_url)")
          .eq("game_id", game.id)
          .neq("user_id", user.id)

        if (teams && teams.length > 0) {
          pendingMvpGame = {
            gameId: game.id,
            date: game.date,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            players: teams.map((t) => {
              const raw = t.profile as any
              const profile = Array.isArray(raw) ? raw[0] : raw
              return {
                userId: t.user_id,
                displayName: profile?.display_name ?? "Unknown",
                avatarUrl: profile?.avatar_url ?? null,
              }
            }),
          }
        }
        break
      }
    }
  }

  return (
    <GroupLayout groupSlug={slug} groupName={group.name} pendingMvpGame={pendingMvpGame}>
      {children}
    </GroupLayout>
  )
}
