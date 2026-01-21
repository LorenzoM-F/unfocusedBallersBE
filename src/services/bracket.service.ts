import { pool } from "../db";
import { HttpError } from "../middleware/errorHandler";

type BracketRow = {
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

type MatchRow = {
  id: string;
  tournament_id: string;
  match_type: string;
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number;
  score_b: number;
  status: string;
};

type GoalRow = {
  id: string;
  match_id: string;
  scoring_team_id: string;
  scoring_player_id: string;
  minute: number | null;
  created_at: string;
};

type GoalListRow = GoalRow & {
  scoring_player_name: string;
};

export const listBrackets = async (tournamentId: string) => {
  const result = await pool.query<BracketRow>(
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

  return result.rows.map((row) => ({
    id: row.id,
    matchType: row.match_type,
    status: row.status,
    scoreA: row.score_a,
    scoreB: row.score_b,
    teamA: row.team_a_id
      ? { id: row.team_a_id, name: row.team_a_name }
      : null,
    teamB: row.team_b_id
      ? { id: row.team_b_id, name: row.team_b_name }
      : null
  }));
};

const mapMatchResponse = (match: MatchRow) => ({
  id: match.id,
  matchType: match.match_type,
  teamAId: match.team_a_id,
  teamBId: match.team_b_id,
  scoreA: match.score_a,
  scoreB: match.score_b,
  status: match.status
});

const assignFinalsIfReady = async (tournamentId: string) => {
  const semis = await pool.query<MatchRow>(
    "SELECT id, match_type, team_a_id, team_b_id, score_a, score_b, status FROM matches WHERE tournament_id = $1 AND match_type IN ('SEMI_1', 'SEMI_2')",
    [tournamentId]
  );

  if (semis.rows.length !== 2) {
    return;
  }

  const [semi1, semi2] = semis.rows;
  if (semi1.status !== "FINAL" || semi2.status !== "FINAL") {
    return;
  }

  const resolveWinnerLoser = (match: MatchRow) => {
    if (!match.team_a_id || !match.team_b_id) {
      throw new HttpError(400, "Semi-final teams not set");
    }
    if (match.score_a === match.score_b) {
      throw new HttpError(400, "Semi-final cannot end in a draw");
    }
    if (match.score_a > match.score_b) {
      return { winner: match.team_a_id, loser: match.team_b_id };
    }
    return { winner: match.team_b_id, loser: match.team_a_id };
  };

  const semi1Result = resolveWinnerLoser(semi1);
  const semi2Result = resolveWinnerLoser(semi2);

  await pool.query(
    "UPDATE matches SET team_a_id = $1, team_b_id = $2, score_a = 0, score_b = 0, status = 'SCHEDULED', updated_at = now() WHERE tournament_id = $3 AND match_type = 'FINAL'",
    [semi1Result.winner, semi2Result.winner, tournamentId]
  );

  await pool.query(
    "UPDATE matches SET team_a_id = $1, team_b_id = $2, score_a = 0, score_b = 0, status = 'SCHEDULED', updated_at = now() WHERE tournament_id = $3 AND match_type = 'THIRD_PLACE'",
    [semi1Result.loser, semi2Result.loser, tournamentId]
  );
};

export const updateMatch = async (
  matchId: string,
  input: { scoreA?: number; scoreB?: number; status?: string }
) => {
  const updates: string[] = [];
  const values: Array<number | string> = [];
  let index = 1;

  const addField = (field: string, value: number | string) => {
    updates.push(`${field} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (input.scoreA !== undefined) addField("score_a", input.scoreA);
  if (input.scoreB !== undefined) addField("score_b", input.scoreB);
  if (input.status !== undefined) addField("status", input.status);

  if (updates.length === 0) {
    throw new HttpError(400, "No fields to update");
  }

  updates.push("updated_at = now()");
  values.push(matchId);

  const result = await pool.query<MatchRow>(
    `UPDATE matches SET ${updates.join(", ")} WHERE id = $${index} RETURNING id, tournament_id, match_type, team_a_id, team_b_id, score_a, score_b, status`,
    values
  );

  const match = result.rows[0];
  if (!match) {
    throw new HttpError(404, "Match not found");
  }

  if (match.match_type.startsWith("SEMI") && match.status === "FINAL") {
    await assignFinalsIfReady(match.tournament_id);
  }

  return mapMatchResponse(match);
};

export const createGoal = async (
  matchId: string,
  scoringTeamId: string,
  scoringPlayerId: string,
  minute?: number
) => {
  const matchResult = await pool.query<MatchRow>(
    "SELECT id, team_a_id, team_b_id FROM matches WHERE id = $1",
    [matchId]
  );

  const match = matchResult.rows[0];
  if (!match) {
    throw new HttpError(404, "Match not found");
  }

  if (![match.team_a_id, match.team_b_id].includes(scoringTeamId)) {
    throw new HttpError(400, "Scoring team is not in match");
  }

  const result = await pool.query<GoalRow>(
    "INSERT INTO match_goals (match_id, scoring_team_id, scoring_player_id, minute) VALUES ($1, $2, $3, $4) RETURNING id, match_id, scoring_team_id, scoring_player_id, minute, created_at",
    [matchId, scoringTeamId, scoringPlayerId, minute ?? null]
  );

  const goal = result.rows[0];
  return {
    id: goal.id,
    matchId: goal.match_id,
    scoringTeamId: goal.scoring_team_id,
    scoringPlayerId: goal.scoring_player_id,
    minute: goal.minute,
    createdAt: goal.created_at
  };
};

export const listGoals = async (matchId: string) => {
  const result = await pool.query<GoalListRow>(
    `SELECT
      mg.id,
      mg.match_id,
      mg.scoring_team_id,
      mg.scoring_player_id,
      mg.minute,
      mg.created_at,
      u.full_name AS scoring_player_name
    FROM match_goals mg
    JOIN users u ON u.id = mg.scoring_player_id
    WHERE mg.match_id = $1
    ORDER BY mg.created_at ASC`,
    [matchId]
  );

  return result.rows.map((goal) => ({
    id: goal.id,
    matchId: goal.match_id,
    scoringTeamId: goal.scoring_team_id,
    scoringPlayerId: goal.scoring_player_id,
    scoringPlayerName: goal.scoring_player_name,
    minute: goal.minute,
    createdAt: goal.created_at
  }));
};

export const deleteGoal = async (goalId: string) => {
  const result = await pool.query<GoalRow>(
    "DELETE FROM match_goals WHERE id = $1 RETURNING id, match_id, scoring_team_id, scoring_player_id, minute, created_at",
    [goalId]
  );

  const goal = result.rows[0];
  if (!goal) {
    throw new HttpError(404, "Goal not found");
  }

  return {
    id: goal.id,
    matchId: goal.match_id,
    scoringTeamId: goal.scoring_team_id,
    scoringPlayerId: goal.scoring_player_id,
    minute: goal.minute,
    createdAt: goal.created_at
  };
};
