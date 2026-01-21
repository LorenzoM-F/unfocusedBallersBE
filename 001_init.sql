-- 001_init.sql
-- Core: users (players + admins), teams, tournaments, registrations, bracket matches, goals, gallery, winners.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'PLAYER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- TEAMS
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tournament_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teams_tournament ON teams(tournament_id);

-- TEAM MEMBERSHIP
CREATE TABLE IF NOT EXISTS team_players (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_players_user ON team_players(user_id);

-- TOURNAMENTS
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NULL,
  start_time TIMESTAMPTZ NULL,
  format_snippet TEXT NOT NULL DEFAULT '5-a-side, 4 teams of 5, 30 min games, single elimination + 3rd/4th playoff',
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'REGISTRATION_OPEN', 'TEAMS_LOCKED', 'IN_PROGRESS', 'COMPLETED')) DEFAULT 'DRAFT',
  max_teams INT NOT NULL DEFAULT 4,
  players_per_team INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);

-- REGISTRATIONS (players registering into a tournament pool)
CREATE TABLE IF NOT EXISTS tournament_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('WAITING', 'ASSIGNED', 'CANCELLED')) DEFAULT 'WAITING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reg_tournament ON tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_reg_status ON tournament_registrations(status);

-- BRACKET MATCHES
-- For 4-team single elim + 3rd place, you want:
-- SEMI_1, SEMI_2, FINAL, THIRD_PLACE
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL CHECK (match_type IN ('SEMI_1', 'SEMI_2', 'FINAL', 'THIRD_PLACE')),
  team_a_id UUID NULL REFERENCES teams(id) ON DELETE SET NULL,
  team_b_id UUID NULL REFERENCES teams(id) ON DELETE SET NULL,
  score_a INT NOT NULL DEFAULT 0,
  score_b INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'FINAL')) DEFAULT 'SCHEDULED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, match_type)
);

CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);

-- GOALS (admin edits who scored)
CREATE TABLE IF NOT EXISTS match_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  scoring_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  scoring_player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  minute INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_match ON match_goals(match_id);

-- GALLERY ITEMS (previous tourneys content)
CREATE TABLE IF NOT EXISTS gallery_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  tournament_id UUID NULL REFERENCES tournaments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WINNERS (for homepage headline)
CREATE TABLE IF NOT EXISTS tournament_winners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  hero_image_url TEXT NULL,
  won_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id)
);
