"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
const errorHandler_1 = require("./errorHandler");
const requireAdmin = (req, _res, next) => {
    if (!req.user) {
        return next(new errorHandler_1.HttpError(401, "Unauthorized"));
    }
    if (req.user.role !== "ADMIN") {
        return next(new errorHandler_1.HttpError(403, "Forbidden"));
    }
    return next();
};
exports.requireAdmin = requireAdmin;
