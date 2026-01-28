import { pool } from "../db";
import { HttpError } from "../middleware/errorHandler";

type TournamentRow = {
  id: string;
  name: string;
  status: string;
};

type MatchRow = {
  id: string;
  match_type: string;
  team_a_id: string | null;
  team_b_id: string | null;
  team_a_name: string | null;
  team_b_name: string | null;
  score_a: number;
  score_b: number;
  status: string;
};

type GoalRow = {
  id: string;
  match_id: string;
  scoring_team_id: string;
  scoring_player_id: string;
  assist_player_id: string | null;
  scoring_team_name: string;
  scoring_player_name: string;
  assist_player_name: string | null;
  minute: number | null;
  created_at: string;
};

type PlayerRow = {
  player_id: string;
  player_name: string;
  team_id: string;
  team_name: string;
};

type PlayerGoalRow = {
  scoring_player_id: string;
  goal_count: number;
};

type TeamMatchRow = {
  team_id: string;
  match_count: number;
};

const mapMatchResponse = (match: MatchRow) => ({
  id: match.id,
  matchType: match.match_type,
  status: match.status,
  scoreA: match.score_a,
  scoreB: match.score_b,
  teamA: match.team_a_id
    ? { id: match.team_a_id, name: match.team_a_name }
    : null,
  teamB: match.team_b_id
    ? { id: match.team_b_id, name: match.team_b_name }
    : null,
  goals: [] as Array<{
    id: string;
    scoringTeamId: string;
    scoringTeamName: string;
    scoringPlayerId: string;
    scoringPlayerName: string;
    assistPlayerId: string | null;
    assistPlayerName: string | null;
    minute: number | null;
    createdAt: string;
  }>
});

export const getTournamentStats = async (tournamentId: string) => {
  const tournamentResult = await pool.query<TournamentRow>(
    "SELECT id, name, status FROM tournaments WHERE id = $1",
    [tournamentId]
  );
  const tournament = tournamentResult.rows[0];
  if (!tournament) {
    throw new HttpError(404, "Tournament not found");
  }

  const matchResult = await pool.query<MatchRow>(
    `SELECT
      m.id,
      m.match_type,
      m.team_a_id,
      m.team_b_id,
      ta.name AS team_a_name,
      tb.name AS team_b_name,
      m.score_a,
      m.score_b,
      m.status
    FROM matches m
    LEFT JOIN teams ta ON ta.id = m.team_a_id
    LEFT JOIN teams tb ON tb.id = m.team_b_id
    WHERE m.tournament_id = $1
    ORDER BY CASE m.match_type
      WHEN 'SEMI_1' THEN 1
      WHEN 'SEMI_2' THEN 2
      WHEN 'FINAL' THEN 3
      WHEN 'THIRD_PLACE' THEN 4
      ELSE 5
    END`,
    [tournamentId]
  );

  const matches = matchResult.rows.map(mapMatchResponse);
  const matchesById = matches.reduce<Record<string, typeof matches[number]>>(
    (acc, match) => {
      acc[match.id] = match;
      return acc;
    },
    {}
  );

  const goalsResult = await pool.query<GoalRow>(
    `SELECT
      mg.id,
      mg.match_id,
      mg.scoring_team_id,
      mg.scoring_player_id,
      mg.assist_player_id,
      mg.minute,
      mg.created_at,
      u.full_name AS scoring_player_name,
      t.name AS scoring_team_name,
      au.full_name AS assist_player_name
    FROM match_goals mg
    JOIN users u ON u.id = mg.scoring_player_id
    LEFT JOIN users au ON au.id = mg.assist_player_id
    JOIN teams t ON t.id = mg.scoring_team_id
    JOIN matches m ON m.id = mg.match_id
    WHERE m.tournament_id = $1
    ORDER BY mg.created_at ASC`,
    [tournamentId]
  );

  goalsResult.rows.forEach((goal) => {
    const match = matchesById[goal.match_id];
    if (!match) return;
    match.goals.push({
      id: goal.id,
      scoringTeamId: goal.scoring_team_id,
      scoringTeamName: goal.scoring_team_name,
      scoringPlayerId: goal.scoring_player_id,
      scoringPlayerName: goal.scoring_player_name,
      assistPlayerId: goal.assist_player_id,
      assistPlayerName: goal.assist_player_name,
      minute: goal.minute,
      createdAt: goal.created_at
    });
  });

  const playerResult = await pool.query<PlayerRow>(
    `SELECT
      u.id AS player_id,
      u.full_name AS player_name,
      t.id AS team_id,
      t.name AS team_name
    FROM team_players tp
    JOIN users u ON u.id = tp.user_id
    JOIN teams t ON t.id = tp.team_id
    WHERE t.tournament_id = $1
    ORDER BY u.full_name ASC`,
    [tournamentId]
  );

  const goalsByPlayerResult = await pool.query<PlayerGoalRow>(
    `SELECT
      mg.scoring_player_id,
      COUNT(*)::int AS goal_count
    FROM match_goals mg
    JOIN matches m ON m.id = mg.match_id
    WHERE m.tournament_id = $1
    GROUP BY mg.scoring_player_id`,
    [tournamentId]
  );

  const matchesByTeamResult = await pool.query<TeamMatchRow>(
    `SELECT
      team_id,
      COUNT(*)::int AS match_count
    FROM (
      SELECT team_a_id AS team_id
      FROM matches
      WHERE tournament_id = $1 AND status != 'SCHEDULED'
      UNION ALL
      SELECT team_b_id AS team_id
      FROM matches
      WHERE tournament_id = $1 AND status != 'SCHEDULED'
    ) AS team_matches
    WHERE team_id IS NOT NULL
    GROUP BY team_id`,
    [tournamentId]
  );

  const goalsByPlayer = goalsByPlayerResult.rows.reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.scoring_player_id] = row.goal_count;
      return acc;
    },
    {}
  );

  const matchesByTeam = matchesByTeamResult.rows.reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.team_id] = row.match_count;
      return acc;
    },
    {}
  );

  const leaderboard = playerResult.rows.map((player) => {
    const goals = goalsByPlayer[player.player_id] ?? 0;
    const matchesPlayed = matchesByTeam[player.team_id] ?? 0;
    const goalsPerGame = matchesPlayed > 0 ? goals / matchesPlayed : 0;

    return {
      playerId: player.player_id,
      playerName: player.player_name,
      teamId: player.team_id,
      teamName: player.team_name,
      goals,
      matchesPlayed,
      goalsPerGame
    };
  });

  leaderboard.sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.goalsPerGame !== a.goalsPerGame) return b.goalsPerGame - a.goalsPerGame;
    return a.playerName.localeCompare(b.playerName);
  });

  const matchesPlayed = matches.filter((match) => match.status !== "SCHEDULED").length;
  const totalGoals = goalsResult.rows.length;
  const goalsPerMatch = matchesPlayed > 0 ? totalGoals / matchesPlayed : 0;

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status
    },
    summary: {
      matchesPlayed,
      totalGoals,
      goalsPerMatch
    },
    leaderboard,
    matches
  };
};
