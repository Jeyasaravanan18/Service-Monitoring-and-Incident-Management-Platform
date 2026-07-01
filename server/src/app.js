import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import logger from "./config/logger.js";
import env from "./config/env.js";

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({ origin: [env.clientOrigin, "http://localhost:5173", "http://127.0.0.1:5173"], credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(mongoSanitize());

  // Rate limiting
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // HTTP request logging
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint — used by Docker, k8s, load balancers
  app.get("/health", (_req, res) => {
    const mongoState = mongoose.connection.readyState;
    const mongoStateMap = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
    res.json({
      status: "ok",
      uptime: Math.floor(process.uptime()),
      mongo: mongoStateMap[mongoState] || "unknown",
      env: env.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api", routes);
  app.use(errorHandler);

  return app;
}
