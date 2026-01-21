"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const public_routes_1 = __importDefault(require("./routes/public.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const player_routes_1 = __importDefault(require("./routes/player.routes"));
const app = (0, express_1.default)();
const allowedOrigins = config_1.config.corsOrigin;
const corsOptions = {
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
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)(corsOptions));
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: 300
}));
app.use(express_1.default.json());
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.use("/auth", auth_routes_1.default);
app.use("/public", public_routes_1.default);
app.use("/admin", admin_routes_1.default);
app.use("/player", player_routes_1.default);
app.use(errorHandler_1.errorHandler);
exports.default = app;
