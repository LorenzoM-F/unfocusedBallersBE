"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const errorHandler_1 = require("./errorHandler");
const authenticate = (req, _res, next) => {
    const header = req.header("Authorization");
    if (!(header === null || header === void 0 ? void 0 : header.startsWith("Bearer "))) {
        return next(new errorHandler_1.HttpError(401, "Missing auth token"));
    }
    const token = header.replace("Bearer ", "").trim();
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        req.user = decoded;
        return next();
    }
    catch (error) {
        return next(new errorHandler_1.HttpError(401, "Invalid auth token"));
    }
};
exports.authenticate = authenticate;
