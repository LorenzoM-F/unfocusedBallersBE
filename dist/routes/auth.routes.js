"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_service_1 = require("../services/auth.service");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const authSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6)
});
const registerSchema = authSchema.extend({
    fullName: zod_1.z.string().min(1)
});
router.post("/register", async (req, res, next) => {
    try {
        const { email, password, fullName } = registerSchema.parse(req.body);
        const payload = await (0, auth_service_1.register)(email, fullName, password);
        res.status(201).json(payload);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.HttpError(400, "Invalid request"));
        }
        return next(error);
    }
});
router.post("/login", async (req, res, next) => {
    try {
        const { email, password } = authSchema.parse(req.body);
        const payload = await (0, auth_service_1.login)(email, password);
        res.json(payload);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return next(new errorHandler_1.HttpError(400, "Invalid request"));
        }
        return next(error);
    }
});
router.get("/me", auth_1.authenticate, async (req, res, next) => {
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
