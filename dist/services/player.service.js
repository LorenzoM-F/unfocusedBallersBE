"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unregisterFromTournament = exports.registerForTournament = void 0;
const db_1 = require("../db");
const errorHandler_1 = require("../middleware/errorHandler");
const ensureTournamentExists = async (tournamentId) => {
    const result = await db_1.pool.query("SELECT id FROM tournaments WHERE id = $1", [
        tournamentId
    ]);
    if (!result.rows[0]) {
        throw new errorHandler_1.HttpError(404, "Tournament not found");
    }
};
const registerForTournament = async (tournamentId, userId) => {
    await ensureTournamentExists(tournamentId);
    const existing = await db_1.pool.query("SELECT status FROM tournament_registrations WHERE tournament_id = $1 AND user_id = $2", [tournamentId, userId]);
    const row = existing.rows[0];
    if (row && row.status !== "CANCELLED") {
        throw new errorHandler_1.HttpError(409, "Already registered");
    }
    if (row && row.status === "CANCELLED") {
        await db_1.pool.query("UPDATE tournament_registrations SET status = 'WAITING' WHERE tournament_id = $1 AND user_id = $2", [tournamentId, userId]);
        return { status: "WAITING" };
    }
    await db_1.pool.query("INSERT INTO tournament_registrations (tournament_id, user_id, status) VALUES ($1, $2, 'WAITING')", [tournamentId, userId]);
    return { status: "WAITING" };
};
exports.registerForTournament = registerForTournament;
const unregisterFromTournament = async (tournamentId, userId) => {
    await ensureTournamentExists(tournamentId);
    const result = await db_1.pool.query("UPDATE tournament_registrations SET status = 'CANCELLED' WHERE tournament_id = $1 AND user_id = $2", [tournamentId, userId]);
    if (result.rowCount === 0) {
        throw new errorHandler_1.HttpError(404, "Registration not found");
    }
    return { status: "CANCELLED" };
};
exports.unregisterFromTournament = unregisterFromTournament;
