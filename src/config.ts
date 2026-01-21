import dotenv from "dotenv";
import type { Secret, SignOptions } from "jsonwebtoken";

dotenv.config();

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const corsOrigins = (raw: string | undefined): string[] => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const config = {
  port: toNumber(process.env.PORT, 3000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET") as Secret,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN ?? "1h") as SignOptions["expiresIn"],
  corsOrigin: corsOrigins(process.env.CORS_ORIGIN)
};
