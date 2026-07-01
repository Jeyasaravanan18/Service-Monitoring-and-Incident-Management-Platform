import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const candidates = [
  path.resolve(cwd, ".env"),
  path.resolve(cwd, "..", ".env"),
  path.resolve(cwd, "..", "..", ".env"),
];

const envPath = candidates.find((candidate) => fs.existsSync(candidate));
dotenv.config(envPath ? { path: envPath } : undefined);

const nodeEnv = process.env.NODE_ENV || "development";
const isProd = nodeEnv === "production";

// Startup validation — fail fast if critical env vars are missing
const errors = [];

if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  errors.push("MONGO_URI is required");
}

if (isProd) {
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET === "dev-access-secret") {
    errors.push("JWT_ACCESS_SECRET must be set to a secure value in production");
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === "dev-refresh-secret") {
    errors.push("JWT_REFRESH_SECRET must be set to a secure value in production");
  }
}

if (errors.length) {
  console.error("[env] Configuration errors:");
  errors.forEach((e) => console.error(` - ${e}`));
  process.exit(1);
}

const env = {
  nodeEnv,
  isProd,
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173",
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || "15m",
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || "30d",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash",
  appName: process.env.APP_NAME || "Service Monitoring and Incident Management Platform",
  resendApiKey: process.env.RESEND_API_KEY || "",
  notificationEmailFrom: process.env.NOTIFICATION_EMAIL_FROM || "",
  notificationWebhookUrl: process.env.NOTIFICATION_WEBHOOK_URL || "",
  notificationSlackWebhookUrl: process.env.NOTIFICATION_SLACK_WEBHOOK_URL || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
};

export default env;
