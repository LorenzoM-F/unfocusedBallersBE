-- 003_add_match_assists.sql
-- Adds match_assists for logging assists independently of goals.

CREATE TABLE IF NOT EXISTS match_assists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  assisting_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  assisting_player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  minute INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_assists_match ON match_assists(match_id);
CREATE INDEX IF NOT EXISTS idx_match_assists_player ON match_assists(assisting_player_id);
