"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPlayers = exports.createPlayer = exports.getUserById = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const config_1 = require("../config");
const password_1 = require("../utils/password");
const random_1 = require("../utils/random");
const errorHandler_1 = require("../middleware/errorHandler");
const toUserResponse = (user) => ({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role
});
const signToken = (user) => {
    return jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, config_1.config.jwtSecret, {
        expiresIn: config_1.config.jwtExpiresIn
    });
};
const register = async (email, fullName, password) => {
    const existing = await db_1.pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rowCount && existing.rows.length > 0) {
        throw new errorHandler_1.HttpError(409, "Email already in use");
    }
    const passwordHash = await (0, password_1.hashPassword)(password);
    const result = await db_1.pool.query("INSERT INTO users (email, full_name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role", [email, fullName, passwordHash, "PLAYER"]);
    const user = result.rows[0];
    const token = signToken({ id: user.id, role: user.role });
    return { user: toUserResponse(user), token };
};
exports.register = register;
const login = async (email, password) => {
    const result = await db_1.pool.query("SELECT id, email, full_name, password_hash, role FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user) {
        throw new errorHandler_1.HttpError(401, "Invalid credentials");
    }
    const ok = await (0, password_1.comparePassword)(password, user.password_hash);
    if (!ok) {
        throw new errorHandler_1.HttpError(401, "Invalid credentials");
    }
    const token = signToken({ id: user.id, role: user.role });
    return { user: toUserResponse(user), token };
};
exports.login = login;
const getUserById = async (userId) => {
    const result = await db_1.pool.query("SELECT id, email, full_name, password_hash, role FROM users WHERE id = $1", [userId]);
    const user = result.rows[0];
    if (!user) {
        throw new errorHandler_1.HttpError(404, "User not found");
    }
    return toUserResponse(user);
};
exports.getUserById = getUserById;
const createPlayer = async (email, fullName) => {
    const existing = await db_1.pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rowCount && existing.rows.length > 0) {
        throw new errorHandler_1.HttpError(409, "Email already in use");
    }
    const generatedPassword = (0, random_1.randomString)(12);
    const passwordHash = await (0, password_1.hashPassword)(generatedPassword);
    const result = await db_1.pool.query("INSERT INTO users (email, full_name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role", [email, fullName, passwordHash, "PLAYER"]);
    const user = result.rows[0];
    return { user: toUserResponse(user), generatedPassword };
};
exports.createPlayer = createPlayer;
const listPlayers = async () => {
    const result = await db_1.pool.query("SELECT id, email, full_name, password_hash, role FROM users WHERE role = $1 ORDER BY created_at ASC", ["PLAYER"]);
    return result.rows.map((row) => toUserResponse(row));
};
exports.listPlayers = listPlayers;
