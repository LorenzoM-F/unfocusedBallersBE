"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const errorHandler_1 = require("../middleware/errorHandler");
const team_service_1 = require("../services/team.service");
const bracket_service_1 = require("../services/bracket.service");
const tournament_service_1 = require("../services/tournament.service");
const router = (0, express_1.Router)();
router.get("/home", async (_req, res, next) => {
    try {
        const winner = await (0, tournament_service_1.getLatestWinner)();
        res.json({ winner });
    }
    catch (error) {
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
router.get("/tournaments/:id", async (req, res, next) => {
    try {
        const result = await (0, tournament_service_1.getTournamentWithWaitingPool)(req.params.id);
        res.json(result);
    }
    catch (error) {
        return next(error);
    }
});
router.get("/teams", async (req, res, next) => {
    try {
        const query = zod_1.z
            .object({ tournamentId: zod_1.z.string().uuid() })
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
router.get("/bracket", async (req, res, next) => {
    try {
        const query = zod_1.z
            .object({ tournamentId: zod_1.z.string().uuid() })
            .safeParse(req.query);
        if (!query.success) {
            throw new errorHandler_1.HttpError(400, "Invalid request");
        }
        const matches = await (0, bracket_service_1.listBrackets)(query.data.tournamentId);
        res.json({ matches });
    }
    catch (error) {
        return next(error);
    }
});
router.get("/info", (_req, res) => {
    res.json({
        message: "Unfocused Ballers API",
        version: "0.1.0"
    });
});
exports.default = router;
