import { Router } from "express";
import { ApiKey, DeploymentEvent, SavedView, Service } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { resolveWorkspaceId } from "../utils/workspace.js";

import env from "../config/env.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const [apiKeys, deployments, views, services] = await Promise.all([
    ApiKey.find({ workspaceId }).sort({ createdAt: -1 }).limit(5).lean(),
    DeploymentEvent.find({ workspaceId }).sort({ deployedAt: -1 }).limit(5).lean(),
    SavedView.find({ workspaceId }).sort({ createdAt: -1 }).limit(5).lean(),
    Service.find({ workspaceId }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  res.json({
    success: true,
    data: {
      apiKeys,
      deployments,
      views,
      services,
      channels: {
        slack: !!env.notificationSlackWebhookUrl,
        email: !!env.resendApiKey && !!env.notificationEmailFrom,
        webhook: !!env.notificationWebhookUrl,
      },
    },
  });
}));

export default router;
