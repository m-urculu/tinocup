// @file src/components/game/TeamDisplay.tsx
// @description Display generated teams — home vs away with player avatars and names
// @depends (none)

import Image from "next/image"

// --- Types ---

type TeamMember = {
  id: string
  user_id: string
  team: string
  profile: { display_name: string; avatar_url: string | null } | null
}

// --- Helpers ---

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// --- Component ---

function PlayerRow({
  player,
  color,
}: {
  player: TeamMember
  color: "electric" | "gold"
}) {
  const name = player.profile?.display_name ?? "Unknown"
  const avatarUrl = player.profile?.avatar_url
  const bgClass = color === "electric" ? "bg-electric/10" : "bg-gold/10"
  const textClass = color === "electric" ? "text-electric-light" : "text-gold-light"

  return (
    <div className={`flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg ${bgClass} ${textClass}`}>
      <div className="relative size-6 rounded-full overflow-hidden shrink-0">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
            {getInitials(name)}
          </div>
        )}
      </div>
      <span className="truncate">{name}</span>
    </div>
  )
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
              <PlayerRow key={p.id} player={p} color="electric" />
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
              <PlayerRow key={p.id} player={p} color="gold" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
