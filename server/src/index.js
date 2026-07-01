import { createServer } from "http";
import { Server } from "socket.io";
import env from "./config/env.js";
import logger from "./config/logger.js";
import { connectDb } from "./config/db.js";
import { createApp } from "./app.js";
import { registerMonitoringJob } from "./jobs/monitoringJob.js";
import { registerCleanupJob } from "./jobs/cleanupJob.js";
import { setRealtimeServer } from "./services/realtimeService.js";
import { verifyAccessToken } from "./utils/tokens.js";

const app = createApp();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: [env.clientOrigin, "http://localhost:5173", "http://127.0.0.1:5173"], credentials: true },
});

io.on("connection", (socket) => {
  logger.info("Socket connected %s", socket.id);

  // Join workspace rooms based on the access token sent on connection
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      const workspaceIds = payload?.workspaceIds || [];
      for (const workspaceId of workspaceIds) {
        socket.join(`workspace:${workspaceId}`);
        logger.info("Socket %s joined workspace:%s", socket.id, workspaceId);
      }
    } catch {
      // Invalid token — socket connects but doesn't join any workspace rooms
      logger.warn("Socket %s sent invalid token — not joining workspace rooms", socket.id);
    }
  }

  socket.emit("server:ready", { appName: env.appName });

  socket.on("disconnect", () => {
    logger.info("Socket disconnected %s", socket.id);
  });
});

await connectDb();
setRealtimeServer(io);
registerMonitoringJob();
registerCleanupJob();

httpServer.listen(env.port, "127.0.0.1", () => {
  logger.info("%s listening on http://127.0.0.1:%d", env.appName, env.port);
});
