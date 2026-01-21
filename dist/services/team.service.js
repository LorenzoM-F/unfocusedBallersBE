"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTeams = exports.addPlayerToTeam = exports.updateTeamName = exports.createTeam = void 0;
const db_1 = require("../db");
const errorHandler_1 = require("../middleware/errorHandler");
const toMemberResponse = (member) => ({
    id: member.id,
    email: member.email,
    fullName: member.full_name,
    role: member.role
});
const createTeam = async (name, tournamentId) => {
    const result = await db_1.pool.query("INSERT INTO teams (name, tournament_id) VALUES ($1, $2) RETURNING id, name, tournament_id", [name, tournamentId !== null && tournamentId !== void 0 ? tournamentId : null]);
    return result.rows[0];
};
exports.createTeam = createTeam;
const updateTeamName = async (teamId, name) => {
    const result = await db_1.pool.query("UPDATE teams SET name = $1, updated_at = now() WHERE id = $2 RETURNING id, name, tournament_id", [name, teamId]);
    const team = result.rows[0];
    if (!team) {
        throw new errorHandler_1.HttpError(404, "Team not found");
    }
    return team;
};
exports.updateTeamName = updateTeamName;
const addPlayerToTeam = async (teamId, userId) => {
    const team = await db_1.pool.query("SELECT id FROM teams WHERE id = $1", [teamId]);
    if (!team.rows[0]) {
        throw new errorHandler_1.HttpError(404, "Team not found");
    }
    const user = await db_1.pool.query("SELECT id, email, full_name, role FROM users WHERE id = $1", [userId]);
    if (!user.rows[0]) {
        throw new errorHandler_1.HttpError(404, "User not found");
    }
    if (user.rows[0].role !== "PLAYER") {
        throw new errorHandler_1.HttpError(400, "User is not a player");
    }
    const result = await db_1.pool.query("INSERT INTO team_players (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [teamId, userId]);
    return { added: result.rowCount === 1 };
};
exports.addPlayerToTeam = addPlayerToTeam;
const listTeams = async (tournamentId) => {
    const result = await db_1.pool.query(`SELECT
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
    ORDER BY t.created_at ASC`, [tournamentId !== null && tournamentId !== void 0 ? tournamentId : null]);
    return result.rows.map((team) => ({
        id: team.id,
        name: team.name,
        tournamentId: team.tournament_id,
        members: team.members.map((member) => toMemberResponse(member))
    }));
};
exports.listTeams = listTeams;
