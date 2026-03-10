// @file src/types/index.ts
// @description App-level TypeScript types and re-exports

import type { Database } from "./database"

// --- Table Row Aliases ---
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Group = Database["public"]["Tables"]["groups"]["Row"]
export type GroupMember = Database["public"]["Tables"]["group_members"]["Row"]
export type Field = Database["public"]["Tables"]["fields"]["Row"]
export type Game = Database["public"]["Tables"]["games"]["Row"]
export type GameSignup = Database["public"]["Tables"]["game_signups"]["Row"]
export type GameTeam = Database["public"]["Tables"]["game_teams"]["Row"]
export type GameGoal = Database["public"]["Tables"]["game_goals"]["Row"]
export type PlayerRating = Database["public"]["Tables"]["player_ratings"]["Row"]
export type Payment = Database["public"]["Tables"]["payments"]["Row"]

// --- Composite Types ---
export type GameWithDetails = Game & {
  field: Field | null
  signups: (GameSignup & { profile: Profile })[]
  teams: (GameTeam & { profile: Profile })[]
  goals: (GameGoal & { profile: Profile })[]
}

export type PlayerCard = PlayerRating & {
  profile: Profile
  win_rate: number
  goals_per_game: number
}

export type GroupWithMembers = Group & {
  members: (GroupMember & { profile: Profile })[]
  member_count: number
}

export type PaymentWithDetails = Payment & {
  profile: Profile
  game: Game
}

// --- Enums ---
export type GameStatus = Game["status"]
export type SignupStatus = GameSignup["status"]
export type TeamSide = GameTeam["team"]
export type MemberRole = GroupMember["role"]

export type { Database }
