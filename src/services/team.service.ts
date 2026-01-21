import { pool } from "../db";
import { HttpError } from "../middleware/errorHandler";

type MemberRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
};

type TeamRow = {
  id: string;
  name: string;
  tournament_id: string | null;
  members: MemberRow[];
};

const toMemberResponse = (member: MemberRow) => ({
  id: member.id,
  email: member.email,
  fullName: member.full_name,
  role: member.role
});

export const createTeam = async (name: string, tournamentId?: string | null) => {
  const result = await pool.query(
    "INSERT INTO teams (name, tournament_id) VALUES ($1, $2) RETURNING id, name, tournament_id",
    [name, tournamentId ?? null]
  );

  return result.rows[0];
};

export const updateTeamName = async (teamId: string, name: string) => {
  const result = await pool.query(
    "UPDATE teams SET name = $1, updated_at = now() WHERE id = $2 RETURNING id, name, tournament_id",
    [name, teamId]
  );

  const team = result.rows[0];
  if (!team) {
    throw new HttpError(404, "Team not found");
  }

  return team;
};

export const addPlayerToTeam = async (teamId: string, userId: string) => {
  const team = await pool.query("SELECT id FROM teams WHERE id = $1", [teamId]);
  if (!team.rows[0]) {
    throw new HttpError(404, "Team not found");
  }

  const user = await pool.query<MemberRow>(
    "SELECT id, email, full_name, role FROM users WHERE id = $1",
    [userId]
  );
  if (!user.rows[0]) {
    throw new HttpError(404, "User not found");
  }
  if (user.rows[0].role !== "PLAYER") {
    throw new HttpError(400, "User is not a player");
  }

  const result = await pool.query(
    "INSERT INTO team_players (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [teamId, userId]
  );

  return { added: result.rowCount === 1 };
};

export const listTeams = async (tournamentId?: string) => {
  const result = await pool.query<TeamRow>(
    `SELECT
      t.id,
      t.name,
      t.tournament_id,
      COALESCE(
        json_agg(
          json_build_object(
            'id', u.id,
            'email', u.email,
            'full_name', u.full_name,
            'role', u.role
          )
        ) FILTER (WHERE u.id IS NOT NULL),
        '[]'::json
      ) AS members
    FROM teams t
    LEFT JOIN team_players tp ON tp.team_id = t.id
    LEFT JOIN users u ON u.id = tp.user_id
    WHERE ($1::uuid IS NULL OR t.tournament_id = $1)
    GROUP BY t.id
    ORDER BY t.created_at ASC`,
    [tournamentId ?? null]
  );

  return result.rows.map((team) => ({
    id: team.id,
    name: team.name,
    tournamentId: team.tournament_id,
    members: team.members.map((member) => toMemberResponse(member))
  }));
};
