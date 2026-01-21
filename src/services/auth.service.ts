import jwt from "jsonwebtoken";
import { pool } from "../db";
import { config } from "../config";
import { comparePassword, hashPassword } from "../utils/password";
import { randomString } from "../utils/random";
import { HttpError } from "../middleware/errorHandler";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  role: string;
};

type UserResponse = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

const toUserResponse = (user: UserRow): UserResponse => ({
  id: user.id,
  email: user.email,
  fullName: user.full_name,
  role: user.role
});

const signToken = (user: Pick<UserRow, "id" | "role">) => {
  return jwt.sign({ userId: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
};

export const register = async (email: string, fullName: string, password: string) => {
  const existing = await pool.query<UserRow>(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );
  if (existing.rowCount && existing.rows.length > 0) {
    throw new HttpError(409, "Email already in use");
  }

  const passwordHash = await hashPassword(password);
  const result = await pool.query<UserRow>(
    "INSERT INTO users (email, full_name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role",
    [email, fullName, passwordHash, "PLAYER"]
  );

  const user = result.rows[0];
  const token = signToken({ id: user.id, role: user.role });

  return { user: toUserResponse(user), token };
};

export const login = async (email: string, password: string) => {
  const result = await pool.query<UserRow>(
    "SELECT id, email, full_name, password_hash, role FROM users WHERE email = $1",
    [email]
  );

  const user = result.rows[0];
  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) {
    throw new HttpError(401, "Invalid credentials");
  }

  const token = signToken({ id: user.id, role: user.role });
  return { user: toUserResponse(user), token };
};

export const getUserById = async (userId: string) => {
  const result = await pool.query<UserRow>(
    "SELECT id, email, full_name, password_hash, role FROM users WHERE id = $1",
    [userId]
  );

  const user = result.rows[0];
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  return toUserResponse(user);
};

export const createPlayer = async (email: string, fullName: string) => {
  const existing = await pool.query<UserRow>(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );
  if (existing.rowCount && existing.rows.length > 0) {
    throw new HttpError(409, "Email already in use");
  }

  const generatedPassword = randomString(12);
  const passwordHash = await hashPassword(generatedPassword);
  const result = await pool.query<UserRow>(
    "INSERT INTO users (email, full_name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role",
    [email, fullName, passwordHash, "PLAYER"]
  );

  const user = result.rows[0];
  return { user: toUserResponse(user), generatedPassword };
};

export const listPlayers = async () => {
  const result = await pool.query<UserRow>(
    "SELECT id, email, full_name, password_hash, role FROM users WHERE role = $1 ORDER BY created_at ASC",
    ["PLAYER"]
  );

  return result.rows.map((row) => toUserResponse(row));
};
