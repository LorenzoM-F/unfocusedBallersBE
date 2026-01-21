import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../middleware/errorHandler";
import { listTeams } from "../services/team.service";
import { listBrackets } from "../services/bracket.service";
import {
  getLatestWinner,
  getTournamentWithWaitingPool,
  listTournaments
} from "../services/tournament.service";

const router = Router();

router.get("/home", async (_req, res, next) => {
  try {
    const winner = await getLatestWinner();
    res.json({ winner });
  } catch (error) {
    return next(error as Error);
  }
});

router.get("/tournaments", async (_req, res, next) => {
  try {
    const tournaments = await listTournaments();
    res.json({ tournaments });
  } catch (error) {
    return next(error as Error);
  }
});

router.get("/tournaments/:id", async (req, res, next) => {
  try {
    const result = await getTournamentWithWaitingPool(req.params.id);
    res.json(result);
  } catch (error) {
    return next(error as Error);
  }
});

router.get("/teams", async (req, res, next) => {
  try {
    const query = z
      .object({ tournamentId: z.string().uuid() })
      .safeParse(req.query);
    if (!query.success) {
      throw new HttpError(400, "Invalid request");
    }

    const teams = await listTeams(query.data.tournamentId);
    res.json({ teams });
  } catch (error) {
    return next(error as Error);
  }
});

router.get("/bracket", async (req, res, next) => {
  try {
    const query = z
      .object({ tournamentId: z.string().uuid() })
      .safeParse(req.query);
    if (!query.success) {
      throw new HttpError(400, "Invalid request");
    }

    const matches = await listBrackets(query.data.tournamentId);
    res.json({ matches });
  } catch (error) {
    return next(error as Error);
  }
});

router.get("/info", (_req, res) => {
  res.json({
    message: "Unfocused Ballers API",
    version: "0.1.0"
  });
});

export default router;
