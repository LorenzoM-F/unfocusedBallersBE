"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_service_1 = require("../services/auth.service");
const player_service_1 = require("../services/player.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const tournamentParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid()
});
router.post("/tournaments/:id/register", async (req, res, next) => {
    try {
        const params = tournamentParamsSchema.parse(req.params);
        if (!req.user) {
            throw new errorHandler_1.HttpError(401, "Unauthorized");
        }
        const result = await (0, player_service_1.registerForTournament)(params.id, req.user.userId);
        res.status(201).json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.HttpError(400, "Invalid request"));
        }
        return next(error);
    }
});
router.post("/tournaments/:id/unregister", async (req, res, next) => {
    try {
        const params = tournamentParamsSchema.parse(req.params);
        if (!req.user) {
            throw new errorHandler_1.HttpError(401, "Unauthorized");
        }
        const result = await (0, player_service_1.unregisterFromTournament)(params.id, req.user.userId);
        res.json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.HttpError(400, "Invalid request"));
        }
        return next(error);
    }
});
router.get("/profile", async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errorHandler_1.HttpError(401, "Unauthorized");
        }
        const user = await (0, auth_service_1.getUserById)(req.user.userId);
        res.json(user);
    }
    catch (error) {
        return next(error);
    }
});
exports.default = router;
