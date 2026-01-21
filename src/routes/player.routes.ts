import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";
import { getUserById } from "../services/auth.service";
import {
  registerForTournament,
  unregisterFromTournament
} from "../services/player.service";

const router = Router();

router.use(authenticate);

const tournamentParamsSchema = z.object({
  id: z.string().uuid()
});

router.post("/tournaments/:id/register", async (req, res, next) => {
  try {
    const params = tournamentParamsSchema.parse(req.params);
    if (!req.user) {
      throw new HttpError(401, "Unauthorized");
    }

    const result = await registerForTournament(params.id, req.user.userId);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request"));
    }
    return next(error as Error);
  }
});

router.post("/tournaments/:id/unregister", async (req, res, next) => {
  try {
    const params = tournamentParamsSchema.parse(req.params);
    if (!req.user) {
      throw new HttpError(401, "Unauthorized");
    }

    const result = await unregisterFromTournament(params.id, req.user.userId);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request"));
    }
    return next(error as Error);
  }
});

router.get("/profile", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new HttpError(401, "Unauthorized");
    }

    const user = await getUserById(req.user.userId);
    res.json(user);
  } catch (error) {
    return next(error as Error);
  }
});

export default router;
