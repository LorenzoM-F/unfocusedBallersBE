import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import publicRoutes from "./routes/public.routes";
import adminRoutes from "./routes/admin.routes";
import playerRoutes from "./routes/player.routes";

const app = express();

const allowedOrigins = config.corsOrigin;
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  }
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300
  })
);
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/public", publicRoutes);
app.use("/admin", adminRoutes);
app.use("/player", playerRoutes);

app.use(errorHandler);

export default app;
