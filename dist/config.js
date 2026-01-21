"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const required = (name) => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env var: ${name}`);
    }
    return value;
};
const toNumber = (value, fallback) => {
    if (!value)
        return fallback;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
};
const corsOrigins = (raw) => {
    if (!raw)
        return [];
    return raw
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
};
exports.config = {
    port: toNumber(process.env.PORT, 3000),
    databaseUrl: required("DATABASE_URL"),
    jwtSecret: required("JWT_SECRET"),
    jwtExpiresIn: ((_a = process.env.JWT_EXPIRES_IN) !== null && _a !== void 0 ? _a : "1h"),
    corsOrigin: corsOrigins(process.env.CORS_ORIGIN)
};
