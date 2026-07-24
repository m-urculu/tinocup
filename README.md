# TinoCup

### Full-stack football group management app

TinoCup is a full-stack web application for recurring amateur football groups. It brings player coordination, match scheduling, balanced team generation, results, ratings, payments and game-day reminders into one shared workflow.

**Live app:** https://tinocup.vercel.app/

> The live app uses phone-based authentication.

---

## What it does

### Authentication and groups
- Phone-based OTP authentication with Supabase Auth
- Create or join a group using an invite code
- Member profiles and avatars
- Group settings and member management

### Games
- Schedule games with date, time, field and team size
- Player attendance / signup flow
- Edit or delete upcoming games
- Record scores and goalscorers

### Balanced teams and ratings
- Generate balanced teams from player ratings
- ELO-based rating updates after completed games
- Shadow-rating prior that decays as match history accumulates
- Team-generation routine that tests multiple permutations and selects the smallest rating gap
- Player statistics and rating history

### Payments
- Per-game cost tracking
- Paid / unpaid status
- Shared payment summaries with MB Way information

### MVP voting
- Post-match MVP voting
- One vote per player per game
- MVP counts integrated into player statistics

### SMS reminders
- Game-day SMS reminders through Twilio
- Vercel Cron runs the reminder endpoint hourly
- Confirmed players are notified when the game is within four hours

---

## Product flow

```text
Phone OTP
   ↓
Create / join group
   ↓
Schedule game
   ↓
Player signups
   ↓
Generate balanced teams
   ↓
Record result
   ↓
Update ratings + payments
   ↓
MVP vote + statistics
```

---

## Tech stack

| Area | Technology |
|---|---|
| Framework | Next.js 16 · React 19 · TypeScript 5 |
| UI | Tailwind CSS 4 · shadcn · Base UI · Framer Motion |
| Auth & database | Supabase Auth · PostgreSQL · Row Level Security |
| Server logic | Next.js Server Actions · Route Handlers |
| Messaging | Twilio SMS |
| Scheduling | Vercel Cron |
| Hosting | Vercel |

---

## Architecture

TinoCup uses the Next.js App Router with server-side application logic and Supabase as the authentication and persistence layer.

```text
Next.js / React UI
        │
        ├── Server Actions / Route Handlers
        │
        ├── Supabase Auth
        │
        └── Supabase / PostgreSQL
                 │
                 └── Row Level Security

Vercel Cron
     │
     └── Reminder endpoint
              │
              ├── Supabase service-role client
              └── Twilio SMS
```

The repository includes SQL migrations for the application schema, RLS policies, ratings, group slugs, reminders, MVP voting and goal tracking.

---

## Repository structure

```text
src/
├── app/
│   ├── auth/
│   ├── group/
│   │   └── [slug]/
│   │       ├── games/
│   │       ├── stats/
│   │       ├── payments/
│   │       ├── fields/
│   │       └── settings/
│   └── api/cron/game-reminders/
├── components/
├── lib/
└── types/

supabase/
└── migrations/

scripts/
```

For a more detailed map of the codebase, see [`CODEBASE_MAP.md`](./CODEBASE_MAP.md).

---

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` and provide the required credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=

CRON_SECRET=
```

Never commit production credentials or personal user data.

### 3. Run the development server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## Useful scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

The repository also contains utilities for seeding test data, simulating game flows and validating the end-to-end match lifecycle.

---

## Security notes

- Row Level Security is enabled across the core application tables.
- A dedicated Supabase service-role client is used for cron/admin tasks that need elevated access.
- The scheduled reminder endpoint requires `CRON_SECRET`.
- `.env*` files are excluded through `.gitignore`.

---

## Status

Personal full-stack product project.

The live deployment is available at:

**https://tinocup.vercel.app/**

---

## Author

**Marcelo Oliveira**

- GitHub: https://github.com/m-urculu
- LinkedIn: https://www.linkedin.com/in/marcelo-henrique-de-oliveira-dev/
