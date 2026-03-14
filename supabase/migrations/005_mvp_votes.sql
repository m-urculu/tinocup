-- MVP voting: one vote per player per completed game
CREATE TABLE game_mvp_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  voted_for UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, voter_id)
);

CREATE INDEX idx_mvp_votes_game ON game_mvp_votes(game_id);
CREATE INDEX idx_mvp_votes_voted_for ON game_mvp_votes(voted_for);

ALTER TABLE game_mvp_votes ENABLE ROW LEVEL SECURITY;

-- Read: any group member can see votes for games in their groups
CREATE POLICY "Members can read MVP votes" ON game_mvp_votes FOR SELECT
  USING (
    game_id IN (
      SELECT g.id FROM games g
      JOIN group_members gm ON gm.group_id = g.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

-- Insert: authenticated user can vote (voter_id must match auth.uid())
CREATE POLICY "Players can cast MVP vote" ON game_mvp_votes FOR INSERT
  WITH CHECK (voter_id = auth.uid());

-- Update: voter can change their vote
CREATE POLICY "Players can update own MVP vote" ON game_mvp_votes FOR UPDATE
  USING (voter_id = auth.uid())
  WITH CHECK (voter_id = auth.uid());
