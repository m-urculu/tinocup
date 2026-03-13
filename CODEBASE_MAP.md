# TinoCup — Codebase Map

## Directory Structure

```
tinocup/
├── scripts/                          # CLI seed/utility scripts
├── src/
│   ├── app/                          # App Router pages
│   │   ├── auth/callback/            # Supabase auth callback
│   │   ├── group/
│   │   │   ├── new/                  # Create/join group
│   │   │   └── [slug]/               # Group pages (slug-based URLs)
│   │   │       ├── games/
│   │   │       │   ├── new/          # Create game
│   │   │       │   └── [gameId]/     # Game detail
│   │   │       ├── stats/            # Leaderboard
│   │   │       ├── payments/         # Payment tracker
│   │   │       ├── fields/           # Field management
│   │   │       └── settings/         # Group settings
│   │   └── profile/setup/            # First-time profile creation
│   ├── components/
│   │   ├── layout/                   # Layout components
│   │   ├── game/                     # Game-related components
│   │   ├── stats/                    # Stats components
│   │   ├── payment/                  # Payment components
│   │   └── ui/                       # shadcn/ui base components
│   ├── app/
│   │   └── api/cron/game-reminders/  # Cron SMS reminders
│   ├── lib/
│   │   └── supabase/                 # Supabase client config
│   └── types/                        # TypeScript types
└── supabase/
    └── migrations/                   # SQL migrations
```

## Files

### `src/app/`

| File | Description |
|------|-------------|
| `layout.tsx` | Root layout — dark FIFA theme, Inter + Bebas Neue fonts, Toaster. |
| `page.tsx` | Landing page with phone OTP login; redirects authenticated users to their group. |
| `globals.css` | FIFA-inspired dark theme with gold/blue accents, glassmorphism utilities. |
| `api/cron/game-reminders/route.ts` | Cron endpoint — sends SMS reminders to confirmed players 4h before game time. |
| `auth/callback/route.ts` | Supabase auth callback handler for OTP verification. |
| `profile/setup/page.tsx` | First-time profile creation (display name). |
| `group/new/page.tsx` | Create or join a group via name or invite code. |
| `group/[slug]/layout.tsx` | Group layout — fetches group by slug, wraps children with header + bottom nav. |
| `group/[slug]/page.tsx` | Group dashboard — quick stats, invite code, upcoming games list. |
| `group/[slug]/games/page.tsx` | All games list with status badges and scores. |
| `group/[slug]/games/new/page.tsx` | Create game form — date, time, field, team size. |
| `group/[slug]/games/new/actions.ts` | Server action for creating a game — auto-sets cost from field price, auto-signs up creator. |
| `group/[slug]/games/[gameId]/page.tsx` | Game detail — signup panel, team display, score entry, goalscorers. Fetches user phone for signup. |
| `group/[slug]/games/[gameId]/actions.ts` | Server actions for game detail — signup, delete, generate teams, submit score with ELO + payments. |
| `group/[slug]/stats/page.tsx` | Stats page — computes group-relative maximums, builds rating history, passes data to StatsView. |
| `group/[slug]/payments/page.tsx` | Payment tracker — per-game cost split, paid/unpaid toggles. |
| `group/[slug]/fields/page.tsx` | Field management — CRUD for fields (name, address, price). |
| `group/[slug]/settings/page.tsx` | Group settings — avatar upload, phone number, members list with avatars, sign out. |

### `src/components/`

| File | Description |
|------|-------------|
| `LoginForm.tsx` | Phone OTP login form with send/verify steps. |
| `InviteCodeButton.tsx` | Copy invite code to clipboard button. |
| `layout/BottomNav.tsx` | Bottom navigation bar — Home, Games, Stats, Payments. |
| `layout/GroupLayout.tsx` | Group page wrapper with header and bottom nav. |
| `game/SignupPanel.tsx` | Game signup — confirm/decline attendance, phone prompt if missing, generate teams via server action. |
| `game/TeamDisplay.tsx` | Display generated teams (home vs away). |
| `game/ScorePanel.tsx` | Score recording — pure UI for score + goalscorers, delegates all logic to server action. |
| `game/PaymentPanel.tsx` | Pick-up-the-tab form after game completion + payment summary with MB Way info. |
| `stats/PlayerCard.tsx` | FUT-style player card with avatar, rating, win rate, goals, W/D/L bar. |
| `payment/PaymentList.tsx` | Payment list grouped by game with paid/unpaid toggle. |

### `src/lib/`

| File | Description |
|------|-------------|
| `utils.ts` | `cn()` helper for merging Tailwind classes. |
| `rating.ts` | ELO rating calculation and team generation (snake draft + fairness optimization). |
| `twilio.ts` | Thin Twilio wrapper for sending SMS messages. |
| `supabase/client.ts` | Browser-side Supabase client. |
| `supabase/server.ts` | Server-side Supabase client for Server Components. |
| `supabase/admin.ts` | Service-role Supabase client that bypasses RLS — for cron jobs and admin tasks. |
| `supabase/middleware.ts` | Supabase auth middleware — refreshes session, redirects unauthenticated users. |

### `src/types/`

| File | Description |
|------|-------------|
| `database.ts` | Supabase database type definitions for all tables with relationships. |
| `index.ts` | App-level TypeScript type aliases and composite types. |

### `src/`

| File | Description |
|------|-------------|
| `middleware.ts` | Next.js middleware entry point — delegates to Supabase session handler. |

### `supabase/migrations/`

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Full database schema — 10 tables with RLS policies and indexes. |
| `002_shadow_rating.sql` | Adds `shadow_rating` column to `player_ratings` for Bayesian team balancing. |
| `003_group_slug.sql` | Adds `slug` column to `groups` for human-readable URLs. |
| `004_game_reminder_sent.sql` | Adds `reminder_sent` flag to games for SMS game-day reminders. |

### Root

| File | Description |
|------|-------------|
| `vercel.json` | Vercel config — hourly cron for game-day SMS reminders. |

### `scripts/`

| File | Description |
|------|-------------|
| `seed-test-users.ts` | Seeds 28 synthetic test users with profiles, group membership, and player ratings (all start at 1000, shadow-balanced by tier). |
| `seed-signups.ts` | Signs up all test users + real users as confirmed for a given game. |
| `simulate-games.ts` | Simulates full game lifecycle (create → signup → shadow-balanced teams → score → ratings → payments). |
| `setup-avatar-bucket.ts` | Creates the Supabase Storage 'avatars' bucket and RLS policies for user avatar uploads. |
| `test-game-flow.ts` | Single-game end-to-end test for verifying the full flow. |
