"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const requireAdmin_1 = require("../middleware/requireAdmin");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_service_1 = require("../services/auth.service");
const team_service_1 = require("../services/team.service");
const tournament_service_1 = require("../services/tournament.service");
const bracket_service_1 = require("../services/bracket.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, requireAdmin_1.requireAdmin);
const playerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    fullName: zod_1.z.string().min(1)
});
const teamCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    tournamentId: zod_1.z.string().uuid().optional()
});
const teamUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1)
});
const addPlayerSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid()
});
const tournamentCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    location: zod_1.z.string().min(1).optional(),
    startTime: zod_1.z.string().datetime().optional()
});
const tournamentUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    location: zod_1.z.string().min(1).optional(),
    startTime: zod_1.z.string().datetime().optional(),
    status: zod_1.z.enum([
        "DRAFT",
        "REGISTRATION_OPEN",
        "TEAMS_LOCKED",
        "IN_PROGRESS",
        "COMPLETED"
    ]).optional()
});
const tournamentParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid()
});
const matchUpdateSchema = zod_1.z.object({
    scoreA: zod_1.z.number().int().min(0).optional(),
    scoreB: zod_1.z.number().int().min(0).optional(),
    status: zod_1.z.enum(["SCHEDULED", "IN_PROGRESS", "FINAL"]).optional()
});
const goalCreateSchema = zod_1.z.object({
    scoringPlayerId: zod_1.z.string().uuid(),
    scoringTeamId: zod_1.z.string().uuid(),
    minute: zod_1.z.number().int().min(0).optional()
});
router.post("/players", async (req, res, next) => {
    try {
        const { email, fullName } = playerSchema.parse(req.body);
        const payload = await (0, auth_service_1.createPlayer)(email, fullName);
        res.status(201).json(payload);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.HttpError(400, "Invalid request"));
        }
        return next(error);
    }
});
router.get("/players", async (_req, res, next) => {
    try {
        const players = await (0, auth_service_1.listPlayers)();
        res.json({ players });
    }
    catch (error) {
        return next(error);
    }
});
router.post("/teams", async (req, res, next) => {
    try {
        const { name, tournamentId } = teamCreateSchema.parse(req.body);
        const team = await (0, team_service_1.createTeam)(name, tournamentId);
        res.status(201).json({ team });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.HttpError(400, "Invalid request"));
        }
        return next(error);
    }
});
router.patch("/teams/:id", async (req, res, next) => {
    try {
        const { name } = teamUpdateSchema.parse(req.body);
        const team = await (0, team_service_1.updateTeamName)(req.params.id, name);
        res.json({ team });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.HttpError(400, "Invalid request"));
        }
        return next(error);
    }
});
router.post("/teams/:teamId/add-player", async (req, res, next) => {
    try {
        const { userId } = addPlayerSchema.parse(req.body);
        const result = await (0, team_service_1.addPlayerToTeam)(req.params.teamId, userId);
        res.status(result.added ? 201 : 200).json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.HttpError(400, "Invalid request"));
        }
        return next(error);
    }
});
router.get("/teams", async (req, res, next) => {
    try {
        const query = zod_1.z
            .object({ tournamentId: zod_1.z.string().uuid().optional() })
            .safeParse(req.query);
        if (!query.success) {
            throw new errorHandler_1.HttpError(400, "Invalid request");
        }
        const teams = await (0, team_service_1.listTeams)(query.data.tournamentId);
        res.json({ teams });
    }
    catch (error) {
        return next(error);
    }
});
router.post("/tournaments", async (req, res, next) => {
    try {
        const payload = tournamentCreateSchema.parse(req.body);
        const tournament = await (0, tournament_service_1.createTournament)(payload);
        res.status(201).json({ tournament });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.HttpError(400, "Invalid request"));
        }
        return next(error);
    }
});
router.patch("/tournaments/:id", async (req, res, next) => {
    try {
        const payload = tournamentUpdateSchema.parse(req.body);
        const tournament = await (0, tournament_service_1.updateTournament)(req.params.id, payload);
        res.json({ tournament });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.HttpError(400, "Invalid request"));
        }
        return next(error);
    }
});
router.get("/tournaments", async (_req, res, next) => {
    try {
        const tournaments = await (0, tournament_service_1.listTournaments)();
        res.json({ tournaments });
    }
    catch (error) {
        return next(error);
    }
});
router.post("/tournaments/:id/generate-teams", async (req, res, next) => {
    try {
        const params = tournamentParamsSchema.parse(req.params);
        await (0, tournament_service_1.generateTeamsAndBracket)(params.id, false);
        const teams = await (0, team_service_1.listTeams)(params.id);
        const matches = await (0, bracket_service_1.listBrackets)(params.id);
        res.json({ teams, matches });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.HttpError(400, "Invalid request"));
        }
        return next(error);
    }
});
router.post("/tournaments/:id/regenerate-teams", async (req, res, next) => {
    try {
        const params = tournamentParamsSchema.parse(req.params);
        await (0, tournament_service_1.generateTeamsAndBracket)(params.id, true);
        const teams = await (0, team_service_1.listTeams)(params.id);
        const matches = await (0, bracket_service_1.listBrackets)(params.id);
        res.json({ teams, matches });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.HttpError(400, "Invalid request"));
        }
        return next(error);
    }
});
router.patch("/matches/:id", async (req, res, next) => {
    try {
        const payload = matchUpdateSchema.parse(req.body);
        const match = await (0, bracket_service_1.updateMatch)(req.params.id, payload);
        res.json({ match });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.HttpError(400, "Invalid request"));
        }
        return next(error);
    }
});
router.post("/matches/:id/goals", async (req, res, next) => {
    try {
        const payload = goalCreateSchema.parse(req.body);
        const goal = await (0, bracket_service_1.createGoal)(req.params.id, payload.scoringTeamId, payload.scoringPlayerId, payload.minute);
        res.status(201).json({ goal });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.HttpError(400, "Invalid request"));
        }
        return next(error);
    }
});
router.delete("/goals/:goalId", async (req, res, next) => {
    try {
        const goalId = zod_1.z.string().uuid().parse(req.params.goalId);
        const goal = await (0, bracket_service_1.deleteGoal)(goalId);
        res.json({ goal });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.HttpError(400, "Invalid request"));
        }
        return next(error);
    }
});
exports.default = router;
