// @file src/app/group/[slug]/games/[gameId]/page.tsx
// @description Game detail — signup, team display, score entry, goalscorers, payments
// @depends lib/supabase/server, components/game/*

import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { SignupPanel } from "@/components/game/SignupPanel"
import { TeamDisplay } from "@/components/game/TeamDisplay"
import { ScorePanel } from "@/components/game/ScorePanel"
import { PaymentPanel } from "@/components/game/PaymentPanel"
import { DeleteGameButton } from "@/components/game/DeleteGameButton"

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ slug: string; gameId: string }>
}) {
  const { slug, gameId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch game
  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single()

  if (!game) notFound()

  // Fetch field if set
  let fieldName: string | null = null
  if (game.field_id) {
    const { data: field } = await supabase
      .from("fields")
      .select("name")
      .eq("id", game.field_id)
      .single()
    fieldName = field?.name ?? null
  }

  // Fetch user phone
  let userPhone: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .single()
    userPhone = profile?.phone || null
  }

  // Fetch signups with profiles
  const { data: signups } = await supabase
    .from("game_signups")
    .select("*, profile:profiles(display_name)")
    .eq("game_id", gameId)

  // Fetch teams with profiles
  const { data: teams } = await supabase
    .from("game_teams")
    .select("*, profile:profiles(display_name)")
    .eq("game_id", gameId)

  // Fetch goals with profiles
  const { data: goals } = await supabase
    .from("game_goals")
    .select("*, profile:profiles(display_name)")
    .eq("game_id", gameId)

  // Fetch payments with profiles
  const { data: payments } = await supabase
    .from("payments")
    .select("id, user_id, amount, paid, profile:profiles(display_name)")
    .eq("game_id", gameId)

  // Fetch payer info
  let paidByName: string | null = null
  let paidByPhone: string | null = null
  if (game.paid_by) {
    const { data: payerProfile } = await supabase
      .from("profiles")
      .select("display_name, phone")
      .eq("id", game.paid_by)
      .single()
    paidByName = payerProfile?.display_name ?? null
    paidByPhone = payerProfile?.phone ?? null
  }

  const confirmed = signups?.filter((s) => s.status === "confirmed") ?? []
  const homeTeam = teams?.filter((t) => t.team === "home") ?? []
  const awayTeam = teams?.filter((t) => t.team === "away") ?? []
  const userSignup = signups?.find((s) => s.user_id === user?.id)
  const isCreator = game.created_by === user?.id
  const totalPlayers = (teams?.length ?? 0) || confirmed.length

  return (
    <div className="space-y-6">
      {/* --- Game Header --- */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-medium">
            {new Date(game.date).toLocaleDateString("pt-PT", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gold/20 text-gold font-medium">
            {game.team_size}v{game.team_size}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {game.time}
          {fieldName && ` · ${fieldName}`}
        </p>
      </div>

      {/* --- Score (if completed) --- */}
      {game.status === "completed" &&
        game.score_home !== null &&
        game.score_away !== null && (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
              Resultado Final
            </p>
            <div className="flex items-center justify-center gap-4">
              <div>
                <p className="text-xs text-electric mb-1">Casa</p>
                <p className="font-[family-name:var(--font-heading)] text-5xl text-foreground">
                  {game.score_home}
                </p>
              </div>
              <p className="font-[family-name:var(--font-heading)] text-2xl text-muted-foreground">
                -
              </p>
              <div>
                <p className="text-xs text-gold mb-1">Fora</p>
                <p className="font-[family-name:var(--font-heading)] text-5xl text-foreground">
                  {game.score_away}
                </p>
              </div>
            </div>
          </div>
        )}

      {/* --- Signup Panel --- */}
      {(game.status === "upcoming" || game.status === "teams_set") && (
        <SignupPanel
          gameId={gameId}
          groupSlug={slug}
          userId={user?.id ?? ""}
          userSignup={userSignup ?? null}
          confirmed={confirmed}
          teamSize={game.team_size}
          userPhone={userPhone}
        />
      )}

      {/* --- Teams --- */}
      {(game.status === "teams_set" ||
        game.status === "in_progress" ||
        game.status === "completed") &&
        homeTeam.length > 0 && (
          <TeamDisplay
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
        )}

      {/* --- Score Entry (creator only, when teams are set) --- */}
      {isCreator &&
        (game.status === "teams_set" || game.status === "in_progress") && (
          <ScorePanel
            gameId={gameId}
            groupSlug={slug}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
        )}

      {/* --- Payment (after game completed) --- */}
      {game.status === "completed" && totalPlayers > 0 && !game.paid_by && (
        <PaymentPanel
          gameId={gameId}
          groupSlug={slug}
          paidBy={game.paid_by}
          paidByName={paidByName}
          paidByPhone={paidByPhone}
          totalCost={game.cost}
          totalPlayers={totalPlayers}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payments={(payments ?? []).map((p: any) => ({ ...p, profile: Array.isArray(p.profile) ? p.profile[0] ?? null : p.profile }))}
          currentUserId={user?.id ?? ""}
        />
      )}

      {/* --- Goal Scorers --- */}
      {goals && goals.length > 0 && (
        <div className="glass rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Marcadores</h3>
          <div className="space-y-2">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {(goal.profile as { display_name: string }).display_name}
                </span>
                <span className="text-gold font-[family-name:var(--font-heading)] text-lg">
                  {goal.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Delete Game (creator only) --- */}
      {isCreator && (
        <DeleteGameButton gameId={gameId} groupSlug={slug} />
      )}
    </div>
  )
}
