"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
const password_1 = require("./utils/password");
const config_1 = require("./config");
dotenv_1.default.config();
const seed = async () => {
    const pool = new pg_1.Pool({ connectionString: config_1.config.databaseUrl });
    try {
        const adminEmail = "lorenzo.fransman@outlook.com";
        const adminFullName = "Lorenzo Fransman";
        const adminPassword = "UB@2026!nB7kQ4zP";
        const adminRole = "ADMIN";
        const existingAdmin = await pool.query("SELECT id FROM users WHERE email = $1", [adminEmail]);
        if (existingAdmin.rowCount && existingAdmin.rows.length > 0) {
            console.log("Admin user already exists.");
        }
        else {
            const passwordHash = await (0, password_1.hashPassword)(adminPassword);
            await pool.query("INSERT INTO users (email, full_name, password_hash, role) VALUES ($1, $2, $3, $4)", [adminEmail, adminFullName, passwordHash, adminRole]);
            console.log("Created admin user.");
        }
        const tournaments = await pool.query("SELECT id FROM tournaments LIMIT 1");
        if (tournaments.rowCount && tournaments.rows.length > 0) {
            console.log("Tournament already exists.");
        }
        else {
            await pool.query("INSERT INTO tournaments (name, format_snippet, status) VALUES ($1, $2, $3)", [
                "Unfocused Ballers Tourney 1",
                "5-a-side, 4 teams of 5, 30 min games, single elimination + 3rd/4th playoff",
                "REGISTRATION_OPEN"
            ]);
            console.log("Created default tournament.");
        }
    }
    catch (error) {
        console.error("Seed failed:", error);
        process.exitCode = 1;
    }
    finally {
        await pool.end();
    }
};
seed();
