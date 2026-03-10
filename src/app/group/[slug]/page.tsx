// @file src/app/group/[slug]/page.tsx
// @description Group dashboard — user profile card, quick stats, upcoming games
// @depends lib/supabase/server

import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Calendar, Users, Trophy, Plus } from "lucide-react"

export default async function GroupDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  // Resolve slug → UUID
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("slug", slug)
    .single()

  if (!group) notFound()
  const groupId = group.id

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user?.id ?? "")
    .single()

  // Fetch upcoming games (no join — avoids RLS issues on fields)
  const { data: upcomingGames } = await supabase
    .from("games")
    .select("*")
    .eq("group_id", groupId)
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
    .eq("group_id", groupId)

  // Fetch user's rating in this group
  const { data: myRating } = await supabase
    .from("player_ratings")
    .select("*")
    .eq("group_id", groupId)
    .eq("user_id", user?.id ?? "")
    .single()

  // User initials
  const displayName = profile?.display_name ?? "Jogador"
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="space-y-6">
      {/* --- User Profile Card --- */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="relative size-14 rounded-full overflow-hidden border-2 border-gold shrink-0">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={displayName}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center text-lg font-bold text-muted-foreground">
                {initials}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg truncate">{displayName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Trophy className="size-4 text-gold" />
              <span className="font-[family-name:var(--font-heading)] text-xl text-gold">
                {myRating?.rating ?? 1000}
              </span>
            </div>
          </div>
          <div className="flex gap-3 text-sm text-center">
            <div>
              <p className="font-bold text-green-400">{myRating?.wins ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">V</p>
            </div>
            <div>
              <p className="font-bold text-yellow-400">{myRating?.draws ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">E</p>
            </div>
            <div>
              <p className="font-bold text-red-400">{myRating?.losses ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">D</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- Quick Stats --- */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-3 text-center">
          <Users className="mx-auto mb-1 size-5 text-electric" />
          <p className="font-[family-name:var(--font-heading)] text-3xl text-foreground">
            {memberCount ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">Jogadores</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <Calendar className="mx-auto mb-1 size-5 text-electric" />
          <p className="font-[family-name:var(--font-heading)] text-3xl text-foreground">
            {myRating?.games_played ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">Jogos</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <svg className="mx-auto mb-1 size-5 text-electric" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2 L14.5 8 L12 6.5 L9.5 8 Z M2 12 L8 9.5 L6.5 12 L8 14.5 Z M22 12 L16 14.5 L17.5 12 L16 9.5 Z M12 22 L9.5 16 L12 17.5 L14.5 16 Z" />
          </svg>
          <p className="font-[family-name:var(--font-heading)] text-3xl text-foreground">
            {myRating?.goals ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">Golos</p>
        </div>
      </div>

      {/* --- New Game Button --- */}
      <Link
        href={`/group/${slug}/games/new`}
        className="flex items-center justify-center gap-2 w-full h-12 rounded-xl gradient-gold text-black font-bold text-base hover:opacity-90 transition-opacity"
      >
        <Plus className="size-5" />
        Novo Jogo
      </Link>

      {/* --- Upcoming Games --- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">
            Próximos Jogos
          </h2>
          <Link
            href={`/group/${slug}/games`}
            className="text-sm text-electric hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {!upcomingGames || upcomingGames.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Gamepad2Icon />
            <p className="mt-2 text-base text-muted-foreground">
              Sem jogos agendados
            </p>
            <Link
              href={`/group/${slug}/games/new`}
              className="mt-3 inline-block text-base font-medium text-gold hover:underline"
            >
              Agendar um →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingGames.map((game) => (
              <Link
                key={game.id}
                href={`/group/${slug}/games/${game.id}`}
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
                  <div className="text-right">
                    <span className="text-sm px-2 py-0.5 rounded-full bg-gold/20 text-gold font-medium">
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
