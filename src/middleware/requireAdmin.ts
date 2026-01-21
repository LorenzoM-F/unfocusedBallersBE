import { NextFunction, Request, Response } from "express";
import { HttpError } from "./errorHandler";

export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new HttpError(401, "Unauthorized"));
  }

  if (req.user.role !== "ADMIN") {
    return next(new HttpError(403, "Forbidden"));
  }

  return next();
};
