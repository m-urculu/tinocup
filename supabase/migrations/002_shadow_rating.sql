-- Add shadow_rating to player_ratings for Bayesian team balancing.
-- Shadow rating represents prior skill knowledge and decays as games are played.
ALTER TABLE player_ratings
  ADD COLUMN IF NOT EXISTS shadow_rating integer NOT NULL DEFAULT 1000;
