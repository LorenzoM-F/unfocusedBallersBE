import { pool } from "../db";
import { HttpError } from "../middleware/errorHandler";

type RegistrationRow = {
  status: string;
};

const ensureTournamentExists = async (tournamentId: string) => {
  const result = await pool.query("SELECT id FROM tournaments WHERE id = $1", [
    tournamentId
  ]);
  if (!result.rows[0]) {
    throw new HttpError(404, "Tournament not found");
  }
};

export const registerForTournament = async (
  tournamentId: string,
  userId: string
) => {
  await ensureTournamentExists(tournamentId);

  const existing = await pool.query<RegistrationRow>(
    "SELECT status FROM tournament_registrations WHERE tournament_id = $1 AND user_id = $2",
    [tournamentId, userId]
  );

  const row = existing.rows[0];
  if (row && row.status !== "CANCELLED") {
    throw new HttpError(409, "Already registered");
  }

  if (row && row.status === "CANCELLED") {
    await pool.query(
      "UPDATE tournament_registrations SET status = 'WAITING' WHERE tournament_id = $1 AND user_id = $2",
      [tournamentId, userId]
    );
    return { status: "WAITING" };
  }

  await pool.query(
    "INSERT INTO tournament_registrations (tournament_id, user_id, status) VALUES ($1, $2, 'WAITING')",
    [tournamentId, userId]
  );

  return { status: "WAITING" };
};

export const unregisterFromTournament = async (
  tournamentId: string,
  userId: string
) => {
  await ensureTournamentExists(tournamentId);

  const result = await pool.query(
    "UPDATE tournament_registrations SET status = 'CANCELLED' WHERE tournament_id = $1 AND user_id = $2",
    [tournamentId, userId]
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, "Registration not found");
  }

  return { status: "CANCELLED" };
};
