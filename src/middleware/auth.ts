import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { HttpError } from "./errorHandler";

type JwtPayload = {
  userId: string;
  role?: string;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: JwtPayload;
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return next(new HttpError(401, "Missing auth token"));
  }

  const token = header.replace("Bearer ", "").trim();
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = decoded;
    return next();
  } catch (error) {
    return next(new HttpError(401, "Invalid auth token"));
  }
};
