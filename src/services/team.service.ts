import { pool } from "../db";
import { HttpError } from "../middleware/errorHandler";
import type { TeamColor } from "../constants/teamColors";

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
  color: TeamColor | null;
  members: MemberRow[];
};

type TeamMetaRow = {
  id: string;
  tournament_id: string | null;
  color: TeamColor | null;
};

const isUniqueViolation = (err: unknown): err is { code: string } =>
  !!err &&
  typeof err === "object" &&
  "code" in err &&
  (err as { code?: string }).code === "23505";

const toMemberResponse = (member: MemberRow) => ({
  id: member.id,
  email: member.email,
  fullName: member.full_name,
  role: member.role
});

export const createTeam = async (
  name: string,
  tournamentId?: string | null,
  color?: TeamColor | null
) => {
  const result = await pool.query(
    "INSERT INTO teams (name, tournament_id, color) VALUES ($1, $2, $3) RETURNING id, name, tournament_id, color",
    [name, tournamentId ?? null, color ?? null]
  );

  return result.rows[0];
};

export const updateTeam = async (
  teamId: string,
  input: { name?: string; color?: TeamColor | null }
) => {
  if (input.color !== undefined) {
    const metaResult = await pool.query<TeamMetaRow>(
      "SELECT id, tournament_id, color FROM teams WHERE id = $1",
      [teamId]
    );

    const meta = metaResult.rows[0];
    if (!meta) {
      throw new HttpError(404, "Team not found");
    }

    if (input.color !== null && meta.tournament_id) {
      const conflict = await pool.query(
        "SELECT 1 FROM teams WHERE tournament_id = $1 AND color = $2 AND id <> $3 LIMIT 1",
        [meta.tournament_id, input.color, teamId]
      );
      if (conflict.rows.length > 0) {
        throw new HttpError(409, "Color already used in this tournament");
      }
    }
  }

  const updates: string[] = [];
  const values: Array<string | TeamColor | null> = [];
  let index = 1;

  const addField = (field: string, value: string | TeamColor | null) => {
    updates.push(`${field} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (input.name !== undefined) addField("name", input.name);
  if (input.color !== undefined) addField("color", input.color ?? null);

  if (updates.length === 0) {
    throw new HttpError(400, "No fields to update");
  }

  updates.push("updated_at = now()");
  values.push(teamId);

  let result;
  try {
    result = await pool.query(
      `UPDATE teams SET ${updates.join(", ")} WHERE id = $${index} RETURNING id, name, tournament_id, color`,
      values
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "Color already used in this tournament");
    }
    throw error;
  }

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
      t.color,
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
    color: team.color,
    members: team.members.map((member) => toMemberResponse(member))
  }));
};
