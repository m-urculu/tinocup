-- @file supabase/migrations/001_initial_schema.sql
-- @description Initial database schema for TinoCup

-- --- Profiles ---
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now() not null
);

alter table profiles enable row level security;
create policy "Users can read all profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- --- Groups ---
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 6)),
  created_by uuid not null references profiles(id),
  avatar_url text,
  created_at timestamptz default now() not null
);

alter table groups enable row level security;
create policy "Members can read their groups" on groups for select
  using (id in (select group_id from group_members where user_id = auth.uid()));
create policy "Authenticated users can create groups" on groups for insert
  with check (auth.uid() = created_by);
create policy "Admins can update group" on groups for update
  using (id in (select group_id from group_members where user_id = auth.uid() and role = 'admin'));

-- --- Group Members ---
create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz default now() not null,
  unique(group_id, user_id)
);

alter table group_members enable row level security;
create policy "Members can read group members" on group_members for select
  using (group_id in (select group_id from group_members gm where gm.user_id = auth.uid()));
create policy "Authenticated users can join groups" on group_members for insert
  with check (auth.uid() = user_id);
create policy "Users can leave groups" on group_members for delete
  using (auth.uid() = user_id);

-- --- Fields ---
create table if not exists fields (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  address text,
  price_per_hour numeric(10,2) not null default 0,
  created_at timestamptz default now() not null
);

alter table fields enable row level security;
create policy "Members can read group fields" on fields for select
  using (group_id in (select group_id from group_members where user_id = auth.uid()));
create policy "Members can manage fields" on fields for all
  using (group_id in (select group_id from group_members where user_id = auth.uid()));

-- --- Games ---
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  field_id uuid references fields(id) on delete set null,
  date date not null,
  time text not null,
  team_size integer not null default 5,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'teams_set', 'in_progress', 'completed', 'cancelled')),
  score_home integer,
  score_away integer,
  paid_by uuid references profiles(id),
  cost numeric(10,2),
  created_by uuid not null references profiles(id),
  created_at timestamptz default now() not null
);

alter table games enable row level security;
create policy "Members can read group games" on games for select
  using (group_id in (select group_id from group_members where user_id = auth.uid()));
create policy "Members can create games" on games for insert
  with check (group_id in (select group_id from group_members where user_id = auth.uid()));
create policy "Creator can update game" on games for update
  using (created_by = auth.uid() or group_id in (
    select group_id from group_members where user_id = auth.uid() and role = 'admin'
  ));

-- --- Game Signups ---
create table if not exists game_signups (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'declined', 'maybe')),
  signed_up_at timestamptz default now() not null,
  unique(game_id, user_id)
);

alter table game_signups enable row level security;
create policy "Members can read game signups" on game_signups for select
  using (game_id in (select id from games where group_id in (
    select group_id from group_members where user_id = auth.uid()
  )));
create policy "Users can manage own signup" on game_signups for all
  using (user_id = auth.uid());

-- --- Game Teams ---
create table if not exists game_teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  team text not null check (team in ('home', 'away')),
  unique(game_id, user_id)
);

alter table game_teams enable row level security;
create policy "Members can read game teams" on game_teams for select
  using (game_id in (select id from games where group_id in (
    select group_id from group_members where user_id = auth.uid()
  )));
create policy "Game creator/admin can manage teams" on game_teams for all
  using (game_id in (select id from games where created_by = auth.uid() or group_id in (
    select group_id from group_members where user_id = auth.uid() and role = 'admin'
  )));

-- --- Game Goals ---
create table if not exists game_goals (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  count integer not null default 1,
  unique(game_id, user_id)
);

alter table game_goals enable row level security;
create policy "Members can read game goals" on game_goals for select
  using (game_id in (select id from games where group_id in (
    select group_id from group_members where user_id = auth.uid()
  )));
create policy "Game creator/admin can manage goals" on game_goals for all
  using (game_id in (select id from games where created_by = auth.uid() or group_id in (
    select group_id from group_members where user_id = auth.uid() and role = 'admin'
  )));

-- --- Player Ratings ---
create table if not exists player_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  rating integer not null default 1000,
  games_played integer not null default 0,
  wins integer not null default 0,
  draws integer not null default 0,
  losses integer not null default 0,
  goals integer not null default 0,
  updated_at timestamptz default now() not null,
  unique(user_id, group_id)
);

alter table player_ratings enable row level security;
create policy "Members can read group ratings" on player_ratings for select
  using (group_id in (select group_id from group_members where user_id = auth.uid()));
create policy "System can manage ratings" on player_ratings for all
  using (group_id in (select group_id from group_members where user_id = auth.uid()));

-- --- Payments ---
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz default now() not null,
  unique(game_id, user_id)
);

alter table payments enable row level security;
create policy "Members can read game payments" on payments for select
  using (game_id in (select id from games where group_id in (
    select group_id from group_members where user_id = auth.uid()
  )));
create policy "Users and admins can manage payments" on payments for all
  using (
    user_id = auth.uid() or
    game_id in (select id from games where created_by = auth.uid() or group_id in (
      select group_id from group_members where user_id = auth.uid() and role = 'admin'
    ))
  );

-- --- Indexes ---
create index idx_group_members_user on group_members(user_id);
create index idx_group_members_group on group_members(group_id);
create index idx_games_group on games(group_id);
create index idx_games_status on games(status);
create index idx_game_signups_game on game_signups(game_id);
create index idx_game_teams_game on game_teams(game_id);
create index idx_game_goals_game on game_goals(game_id);
create index idx_player_ratings_group on player_ratings(group_id);
create index idx_payments_game on payments(game_id);
