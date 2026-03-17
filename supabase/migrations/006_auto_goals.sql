-- Add auto_goals column to game_goals for tracking own goals
alter table game_goals add column auto_goals integer not null default 0;
