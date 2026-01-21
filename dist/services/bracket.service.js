"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGoal = exports.createGoal = exports.updateMatch = exports.listBrackets = void 0;
const db_1 = require("../db");
const errorHandler_1 = require("../middleware/errorHandler");
const listBrackets = async (tournamentId) => {
    const result = await db_1.pool.query(`SELECT
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
    END`, [tournamentId]);
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
exports.listBrackets = listBrackets;
const mapMatchResponse = (match) => ({
    id: match.id,
    matchType: match.match_type,
    teamAId: match.team_a_id,
    teamBId: match.team_b_id,
    scoreA: match.score_a,
    scoreB: match.score_b,
    status: match.status
});
const assignFinalsIfReady = async (tournamentId) => {
    const semis = await db_1.pool.query("SELECT id, match_type, team_a_id, team_b_id, score_a, score_b, status FROM matches WHERE tournament_id = $1 AND match_type IN ('SEMI_1', 'SEMI_2')", [tournamentId]);
    if (semis.rows.length !== 2) {
        return;
    }
    const [semi1, semi2] = semis.rows;
    if (semi1.status !== "FINAL" || semi2.status !== "FINAL") {
        return;
    }
    const resolveWinnerLoser = (match) => {
        if (!match.team_a_id || !match.team_b_id) {
            throw new errorHandler_1.HttpError(400, "Semi-final teams not set");
        }
        if (match.score_a === match.score_b) {
            throw new errorHandler_1.HttpError(400, "Semi-final cannot end in a draw");
        }
        if (match.score_a > match.score_b) {
            return { winner: match.team_a_id, loser: match.team_b_id };
        }
        return { winner: match.team_b_id, loser: match.team_a_id };
    };
    const semi1Result = resolveWinnerLoser(semi1);
    const semi2Result = resolveWinnerLoser(semi2);
    await db_1.pool.query("UPDATE matches SET team_a_id = $1, team_b_id = $2, score_a = 0, score_b = 0, status = 'SCHEDULED', updated_at = now() WHERE tournament_id = $3 AND match_type = 'FINAL'", [semi1Result.winner, semi2Result.winner, tournamentId]);
    await db_1.pool.query("UPDATE matches SET team_a_id = $1, team_b_id = $2, score_a = 0, score_b = 0, status = 'SCHEDULED', updated_at = now() WHERE tournament_id = $3 AND match_type = 'THIRD_PLACE'", [semi1Result.loser, semi2Result.loser, tournamentId]);
};
const updateMatch = async (matchId, input) => {
    const updates = [];
    const values = [];
    let index = 1;
    const addField = (field, value) => {
        updates.push(`${field} = $${index}`);
        values.push(value);
        index += 1;
    };
    if (input.scoreA !== undefined)
        addField("score_a", input.scoreA);
    if (input.scoreB !== undefined)
        addField("score_b", input.scoreB);
    if (input.status !== undefined)
        addField("status", input.status);
    if (updates.length === 0) {
        throw new errorHandler_1.HttpError(400, "No fields to update");
    }
    updates.push("updated_at = now()");
    values.push(matchId);
    const result = await db_1.pool.query(`UPDATE matches SET ${updates.join(", ")} WHERE id = $${index} RETURNING id, tournament_id, match_type, team_a_id, team_b_id, score_a, score_b, status`, values);
    const match = result.rows[0];
    if (!match) {
        throw new errorHandler_1.HttpError(404, "Match not found");
    }
    if (match.match_type.startsWith("SEMI") && match.status === "FINAL") {
        await assignFinalsIfReady(match.tournament_id);
    }
    return mapMatchResponse(match);
};
exports.updateMatch = updateMatch;
const createGoal = async (matchId, scoringTeamId, scoringPlayerId, minute) => {
    const matchResult = await db_1.pool.query("SELECT id, team_a_id, team_b_id FROM matches WHERE id = $1", [matchId]);
    const match = matchResult.rows[0];
    if (!match) {
        throw new errorHandler_1.HttpError(404, "Match not found");
    }
    if (![match.team_a_id, match.team_b_id].includes(scoringTeamId)) {
        throw new errorHandler_1.HttpError(400, "Scoring team is not in match");
    }
    const result = await db_1.pool.query("INSERT INTO match_goals (match_id, scoring_team_id, scoring_player_id, minute) VALUES ($1, $2, $3, $4) RETURNING id, match_id, scoring_team_id, scoring_player_id, minute, created_at", [matchId, scoringTeamId, scoringPlayerId, minute !== null && minute !== void 0 ? minute : null]);
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
exports.createGoal = createGoal;
const deleteGoal = async (goalId) => {
    const result = await db_1.pool.query("DELETE FROM match_goals WHERE id = $1 RETURNING id, match_id, scoring_team_id, scoring_player_id, minute, created_at", [goalId]);
    const goal = result.rows[0];
    if (!goal) {
        throw new errorHandler_1.HttpError(404, "Goal not found");
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
exports.deleteGoal = deleteGoal;
