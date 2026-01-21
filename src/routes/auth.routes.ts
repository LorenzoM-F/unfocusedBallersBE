import { Router } from "express";
import { z } from "zod";
import { getUserById, login, register } from "../services/auth.service";
import { HttpError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";

const router = Router();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = authSchema.extend({
  fullName: z.string().min(1)
});

router.post("/register", async (req, res, next) => {
  try {
    const { email, password, fullName } = registerSchema.parse(req.body);
    const payload = await register(email, fullName, password);
    res.status(201).json(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request"));
    }
    return next(error as Error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = authSchema.parse(req.body);
    const payload = await login(email, password);
    res.json(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new HttpError(400, "Invalid request"));
    }
    return next(error as Error);
  }
});

router.get("/me", authenticate, async (req, res, next) => {
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
