import { pool } from "../db";
import { HttpError } from "../middleware/errorHandler";

type TournamentRow = {
  id: string;
  name: string;
  location: string | null;
  start_time: string | null;
  format_snippet: string;
  status: string;
  max_teams: number;
  players_per_team: number;
};

type WinnerRow = {
  headline: string;
  hero_image_url: string | null;
  won_on: string;
  team_name: string;
  tournament_name: string;
};

type WaitingPlayerRow = {
  id: string;
  full_name: string;
};

type TournamentCreateInput = {
  name: string;
  location?: string | null;
  startTime?: string | null;
};

type TournamentUpdateInput = {
  name?: string;
  location?: string | null;
  startTime?: string | null;
  status?: string;
};

type TeamRow = {
  id: string;
  name: string;
  tournament_id: string;
};

type RegistrationRow = {
  user_id: string;
};

type MatchRow = {
  id: string;
  match_type: string;
};

const toTournamentResponse = (row: TournamentRow) => ({
  id: row.id,
  name: row.name,
  location: row.location,
  startTime: row.start_time,
  formatSnippet: row.format_snippet,
  status: row.status
});

export const getLatestWinner = async () => {
  const result = await pool.query<WinnerRow>(
    `SELECT
      tw.headline,
      tw.hero_image_url,
      tw.won_on,
      teams.name AS team_name,
      tournaments.name AS tournament_name
    FROM tournament_winners tw
    JOIN teams ON teams.id = tw.team_id
    JOIN tournaments ON tournaments.id = tw.tournament_id
    ORDER BY tw.won_on DESC, tw.created_at DESC
    LIMIT 1`
  );

  const winner = result.rows[0];
  if (!winner) {
    return null;
  }

  return {
    headline: winner.headline,
    heroImageUrl: winner.hero_image_url,
    wonOn: winner.won_on,
    teamName: winner.team_name,
    tournamentName: winner.tournament_name
  };
};

export const createTournament = async (input: TournamentCreateInput) => {
  const result = await pool.query<TournamentRow>(
    "INSERT INTO tournaments (name, location, start_time) VALUES ($1, $2, $3) RETURNING id, name, location, start_time, format_snippet, status",
    [input.name, input.location ?? null, input.startTime ?? null]
  );

  return toTournamentResponse(result.rows[0]);
};

export const updateTournament = async (id: string, input: TournamentUpdateInput) => {
  const updates: string[] = [];
  const values: Array<string | null> = [];
  let index = 1;

  const addField = (field: string, value: string | null) => {
    updates.push(`${field} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (input.name !== undefined) addField("name", input.name);
  if (input.location !== undefined) addField("location", input.location ?? null);
  if (input.startTime !== undefined) addField("start_time", input.startTime ?? null);
  if (input.status !== undefined) addField("status", input.status);

  if (updates.length === 0) {
    throw new HttpError(400, "No fields to update");
  }

  updates.push(`updated_at = now()`);
  values.push(id);

  const result = await pool.query<TournamentRow>(
    `UPDATE tournaments SET ${updates.join(", ")} WHERE id = $${index} RETURNING id, name, location, start_time, format_snippet, status`,
    values
  );

  const tournament = result.rows[0];
  if (!tournament) {
    throw new HttpError(404, "Tournament not found");
  }

  return toTournamentResponse(tournament);
};

export const listTournaments = async () => {
  const result = await pool.query<TournamentRow>(
    "SELECT id, name, location, start_time, format_snippet, status FROM tournaments ORDER BY created_at ASC"
  );

  return result.rows.map((row) => toTournamentResponse(row));
};

export const getTournamentWithWaitingPool = async (id: string) => {
  const tournamentResult = await pool.query<TournamentRow>(
    "SELECT id, name, location, start_time, format_snippet, status FROM tournaments WHERE id = $1",
    [id]
  );

  const tournament = tournamentResult.rows[0];
  if (!tournament) {
    throw new HttpError(404, "Tournament not found");
  }

  const waitingResult = await pool.query<WaitingPlayerRow>(
    `SELECT u.id, u.full_name
     FROM tournament_registrations tr
     JOIN users u ON u.id = tr.user_id
     WHERE tr.tournament_id = $1 AND tr.status = 'WAITING'
     ORDER BY tr.created_at ASC`,
    [id]
  );

  return {
    tournament: toTournamentResponse(tournament),
    waitingPool: waitingResult.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name
    }))
  };
};

const shuffle = <T>(items: T[]) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

type DbClient = { query: typeof pool.query };

const ensureTeamCount = async (
  tournamentId: string,
  maxTeams: number,
  useClient: DbClient
) => {
  const existing = await useClient.query<TeamRow>(
    "SELECT id, name, tournament_id FROM teams WHERE tournament_id = $1 ORDER BY name ASC",
    [tournamentId]
  );

  if (existing.rows.length > maxTeams) {
    throw new HttpError(400, "Too many teams for tournament");
  }

  const teams = [...existing.rows];
  if (teams.length < maxTeams) {
    for (let i = teams.length; i < maxTeams; i += 1) {
      const name = `Team ${i + 1}`;
      const created = await useClient.query<TeamRow>(
        "INSERT INTO teams (name, tournament_id) VALUES ($1, $2) RETURNING id, name, tournament_id",
        [name, tournamentId]
      );
      teams.push(created.rows[0]);
    }
  }

  return teams;
};

const resetMatches = async (tournamentId: string, useClient: DbClient) => {
  await useClient.query("DELETE FROM matches WHERE tournament_id = $1", [
    tournamentId
  ]);
};

const createMatches = async (
  tournamentId: string,
  teams: TeamRow[],
  useClient: DbClient
) => {
  const [team1, team2, team3, team4] = teams;
  const matches = [
    {
      matchType: "SEMI_1",
      teamA: team1?.id ?? null,
      teamB: team2?.id ?? null
    },
    {
      matchType: "SEMI_2",
      teamA: team3?.id ?? null,
      teamB: team4?.id ?? null
    },
    {
      matchType: "FINAL",
      teamA: null,
      teamB: null
    },
    {
      matchType: "THIRD_PLACE",
      teamA: null,
      teamB: null
    }
  ];

  const created: MatchRow[] = [];
  for (const match of matches) {
    const result = await useClient.query<MatchRow>(
      `INSERT INTO matches (tournament_id, match_type, team_a_id, team_b_id, score_a, score_b, status)
       VALUES ($1, $2, $3, $4, 0, 0, 'SCHEDULED')
       RETURNING id, match_type`,
      [tournamentId, match.matchType, match.teamA, match.teamB]
    );
    created.push(result.rows[0]);
  }

  return created;
};

export const generateTeamsAndBracket = async (
  tournamentId: string,
  regenerate: boolean
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tournamentResult = await client.query<TournamentRow>(
      "SELECT id, status, max_teams, players_per_team FROM tournaments WHERE id = $1",
      [tournamentId]
    );
    const tournament = tournamentResult.rows[0];
    if (!tournament) {
      throw new HttpError(404, "Tournament not found");
    }

    if (!["REGISTRATION_OPEN", "TEAMS_LOCKED"].includes(tournament.status)) {
      throw new HttpError(400, "Tournament status does not allow team generation");
    }

    if (regenerate) {
      await client.query(
        "UPDATE tournament_registrations SET status = 'WAITING' WHERE tournament_id = $1 AND status = 'ASSIGNED'",
        [tournamentId]
      );
      await resetMatches(tournamentId, client);
    }

    const requiredCount = tournament.max_teams * tournament.players_per_team;
    const waiting = await client.query<RegistrationRow>(
      "SELECT user_id FROM tournament_registrations WHERE tournament_id = $1 AND status = 'WAITING' ORDER BY created_at ASC",
      [tournamentId]
    );

    if (waiting.rows.length !== requiredCount) {
      throw new HttpError(400, "Invalid number of registrations");
    }

    const teams = await ensureTeamCount(tournamentId, tournament.max_teams, client);
    await client.query(
      "DELETE FROM team_players WHERE team_id IN (SELECT id FROM teams WHERE tournament_id = $1)",
      [tournamentId]
    );

    const shuffled = shuffle(waiting.rows.map((row) => row.user_id));
    const teamSize = tournament.players_per_team;

    for (let teamIndex = 0; teamIndex < teams.length; teamIndex += 1) {
      const team = teams[teamIndex];
      const members = shuffled.slice(
        teamIndex * teamSize,
        teamIndex * teamSize + teamSize
      );
      for (const userId of members) {
        await client.query(
          "INSERT INTO team_players (team_id, user_id) VALUES ($1, $2)",
          [team.id, userId]
        );
      }
    }

    await client.query(
      "UPDATE tournament_registrations SET status = 'ASSIGNED' WHERE tournament_id = $1 AND status = 'WAITING'",
      [tournamentId]
    );

    await client.query(
      "UPDATE tournaments SET status = 'TEAMS_LOCKED', updated_at = now() WHERE id = $1",
      [tournamentId]
    );

    if (!regenerate) {
      await resetMatches(tournamentId, client);
    }
    await createMatches(tournamentId, teams, client);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
