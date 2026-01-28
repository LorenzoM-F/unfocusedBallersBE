-- 002_add_goal_assists.sql
-- Adds optional assist player to match_goals.

ALTER TABLE match_goals
  ADD COLUMN IF NOT EXISTS assist_player_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'match_goals_assist_player_id_fkey'
  ) THEN
    ALTER TABLE match_goals
      ADD CONSTRAINT match_goals_assist_player_id_fkey
      FOREIGN KEY (assist_player_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_goals_assist_player ON match_goals(assist_player_id);
