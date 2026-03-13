-- @file supabase/migrations/004_game_reminder_sent.sql
-- @description Adds reminder_sent flag to games for SMS game-day reminders.

alter table games add column reminder_sent boolean not null default false;
create index idx_games_date_reminder on games(date, reminder_sent) where reminder_sent = false;
