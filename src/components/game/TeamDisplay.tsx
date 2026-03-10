// @file src/components/game/TeamDisplay.tsx
// @description Display generated teams — home vs away with player names

type TeamMember = {
  id: string
  user_id: string
  team: string
  profile: { display_name: string } | null
}

export function TeamDisplay({
  homeTeam,
  awayTeam,
}: {
  homeTeam: TeamMember[]
  awayTeam: TeamMember[]
}) {
  return (
    <div className="glass rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-4 text-center">Equipas</h3>
      <div className="grid grid-cols-2 gap-4">
        {/* --- Home --- */}
        <div>
          <p className="text-center text-xs font-bold text-electric mb-2 uppercase tracking-wider">
            Casa
          </p>
          <div className="space-y-1.5">
            {homeTeam.map((p) => (
              <div
                key={p.id}
                className="text-center text-sm py-1.5 rounded-lg bg-electric/10 text-electric-light"
              >
                {p.profile?.display_name ?? "Unknown"}
              </div>
            ))}
          </div>
        </div>

        {/* --- Away --- */}
        <div>
          <p className="text-center text-xs font-bold text-gold mb-2 uppercase tracking-wider">
            Fora
          </p>
          <div className="space-y-1.5">
            {awayTeam.map((p) => (
              <div
                key={p.id}
                className="text-center text-sm py-1.5 rounded-lg bg-gold/10 text-gold-light"
              >
                {p.profile?.display_name ?? "Unknown"}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
