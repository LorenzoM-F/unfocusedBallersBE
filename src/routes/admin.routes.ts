import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireAdmin";
import { HttpError } from "../middleware/errorHandler";
import { TEAM_COLORS } from "../constants/teamColors";
import { createPlayer, listPlayers } from "../services/auth.service";
import {
  addPlayerToTeam,
  createTeam,
  listTeams,
  updateTeam
} from "../services/team.service";
import {
  createTournament,
  generateTeamsAndBracket,
  listTournaments,
  updateTournament
} from "../services/tournament.service";
import {
  createGoal,
  deleteGoal,
  updateMatch,
  listBrackets,
  listGoals
} from "../services/bracket.service";

const router = Router();

router.use(authenticate, requireAdmin);

const playerSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1)
});

const teamColorEnum = z.enum(TEAM_COLORS);

const teamCreateSchema = z.object({
  name: z.string().min(1),
  tournamentId: z.string().uuid().optional(),
  color: teamColorEnum.nullable().optional()
});

const teamUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  color: teamColorEnum.nullable().optional()
});

const addPlayerSchema = z.object({
  userId: z.string().uuid()
});

const tournamentCreateSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1).optional(),
  startTime: z.string().datetime().optional()
});

const tournamentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  startTime: z.string().datetime().optional(),
  status: z.enum([
    "DRAFT",
    "REGISTRATION_OPEN",
    "TEAMS_LOCKED",
    "IN_PROGRESS",
    "COMPLETED"
  ]).optional()
});

const tournamentParamsSchema = z.object({
  id: z.string().uuid()
});

const matchUpdateSchema = z.object({
  scoreA: z.number().int().min(0).optional(),
  scoreB: z.number().int().min(0).optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "FINAL"]).optional()
});

const goalCreateSchema = z.object({
  scoringPlayerId: z.string().uuid(),
  scoringTeamId: z.string().uuid(),
  assistPlayerId: z.string().uuid().optional(),
  minute: z.number().int().min(0).optional()
});

router.post("/players", async (req, res, next) => {
  try {
    const { email, fullName } = playerSchema.parse(req.body);
    const payload = await createPlayer(email, fullName);
    res.status(201).json(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request"));
    }
    return next(error as Error);
  }
});

router.get("/players", async (_req, res, next) => {
  try {
    const players = await listPlayers();
    res.json({ players });
  } catch (error) {
    return next(error as Error);
  }
});

router.post("/teams", async (req, res, next) => {
  try {
    const { name, tournamentId, color } = teamCreateSchema.parse(req.body);
    const team = await createTeam(name, tournamentId, color);
    res.status(201).json({ team });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request"));
    }
    return next(error as Error);
  }
});

router.patch("/teams/:id", async (req, res, next) => {
  try {
    const payload = teamUpdateSchema.parse(req.body);
    const team = await updateTeam(req.params.id, payload);
    res.json({ team });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request"));
    }
    return next(error as Error);
  }
});

router.post("/teams/:teamId/add-player", async (req, res, next) => {
  try {
    const { userId } = addPlayerSchema.parse(req.body);
    const result = await addPlayerToTeam(req.params.teamId, userId);
    res.status(result.added ? 201 : 200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request"));
    }
    return next(error as Error);
  }
});

router.get("/teams", async (req, res, next) => {
  try {
    const query = z
      .object({ tournamentId: z.string().uuid().optional() })
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

router.post("/tournaments", async (req, res, next) => {
  try {
    const payload = tournamentCreateSchema.parse(req.body);
    const tournament = await createTournament(payload);
    res.status(201).json({ tournament });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request"));
    }
    return next(error as Error);
  }
});

router.patch("/tournaments/:id", async (req, res, next) => {
  try {
    const payload = tournamentUpdateSchema.parse(req.body);
    const tournament = await updateTournament(req.params.id, payload);
    res.json({ tournament });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request"));
    }
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

router.post("/tournaments/:id/generate-teams", async (req, res, next) => {
  try {
    const params = tournamentParamsSchema.parse(req.params);
    await generateTeamsAndBracket(params.id, false);
    const teams = await listTeams(params.id);
    const matches = await listBrackets(params.id);
    res.json({ teams, matches });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request"));
    }
    return next(error as Error);
  }
});

router.post("/tournaments/:id/regenerate-teams", async (req, res, next) => {
  try {
    const params = tournamentParamsSchema.parse(req.params);
    await generateTeamsAndBracket(params.id, true);
    const teams = await listTeams(params.id);
    const matches = await listBrackets(params.id);
    res.json({ teams, matches });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request"));
    }
    return next(error as Error);
  }
});

router.patch("/matches/:id", async (req, res, next) => {
  try {
    const payload = matchUpdateSchema.parse(req.body);
    const match = await updateMatch(req.params.id, payload);
    res.json({ match });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request"));
    }
    return next(error as Error);
  }
});

router.post("/matches/:id/goals", async (req, res, next) => {
  try {
    const payload = goalCreateSchema.parse(req.body);
    const goal = await createGoal(
      req.params.id,
      payload.scoringTeamId,
      payload.scoringPlayerId,
      payload.assistPlayerId,
      payload.minute
    );
    res.status(201).json({ goal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request"));
    }
    return next(error as Error);
  }
});

router.get("/matches/:id/goals", async (req, res, next) => {
  try {
    const matchId = z.string().uuid().parse(req.params.id);
    const goals = await listGoals(matchId);
    res.json({ goals });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request"));
    }
    return next(error as Error);
  }
});

router.delete("/goals/:goalId", async (req, res, next) => {
  try {
    const goalId = z.string().uuid().parse(req.params.goalId);
    const goal = await deleteGoal(goalId);
    res.json({ goal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request"));
    }
    return next(error as Error);
  }
});

export default router;
