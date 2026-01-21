import { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ error: message });
};
