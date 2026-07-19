import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { CheckResult, DeploymentEvent, Incident, LogEntry, Metric, Service, ServiceDependency, Alert, AlertRule, SLOTarget } from "../models/index.js";
import { computeHealthScore } from "../utils/health.js";
import logger from "../config/logger.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { recordAuditLog } from "../services/auditService.js";
import { emitRealtime } from "../services/realtimeService.js";
import { resolveWorkspaceId } from "../utils/workspace.js";
import { encrypt } from "../utils/crypto.js";

const serviceSchema = z.object({
  name: z.string().min(2),
  url: z.string().url(),
  environment: z.enum(["dev", "staging", "prod"]).default("prod"),
  tags: z.array(z.string()).default([]),
  maintenanceMode: z.boolean().default(false),
  expectedKeyword: z.string().optional().default(""),
  customHeaders: z.record(z.string()).optional().default({}),
  apiKey: z.string().optional().default(""),
  checkIntervalMinutes: z.number().min(1).max(1440).default(5),
  teamId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
});

const router = Router();

function workspaceIdFor(req) {
  return resolveWorkspaceId(req);
}

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const workspaceId = workspaceIdFor(req);
  const services = await Service.find({ workspaceId }).sort({ createdAt: -1 }).lean();
  res.json({
    success: true,
    data: services.map((service) => ({ ...service, healthScore: computeHealthScore(service) })),
  });
}));

router.post("/", requireAuth, requireRole(["super-admin", "admin"]), asyncHandler(async (req, res) => {
  const workspaceId = workspaceIdFor(req);
  if (!workspaceId) throw new ApiError(400, "Workspace context required");
  const payload = serviceSchema.parse(req.body);
  if (payload.apiKey) {
    payload.apiKey = encrypt(payload.apiKey);
  }
  const service = await Service.create({ ...payload, workspaceId });
  await recordAuditLog({
    workspaceId,
    actorId: req.auth.sub,
    action: "service.create",
    resourceType: "service",
    resourceId: service._id,
    details: { name: service.name },
  });
  emitRealtime("service:updated", { serviceId: service._id.toString(), workspaceId, action: "created" });
  res.status(201).json({ success: true, data: service });
}));

router.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const workspaceId = workspaceIdFor(req);
  const service = await Service.findOne({ _id: req.params.id, workspaceId }).lean();
  if (!service) throw new ApiError(404, "Service not found");

  const [checks, alerts, incidents, logs, metrics, deployments, dependencies] = await Promise.all([
    CheckResult.find({ serviceId: service._id }).sort({ checkedAt: -1 }).limit(24).lean(),
    Alert.find({ serviceId: service._id }).sort({ createdAt: -1 }).limit(24).lean(),
    Incident.find({ serviceId: service._id }).sort({ createdAt: -1 }).limit(24).lean(),
    LogEntry.find({ serviceId: service._id }).sort({ occurredAt: -1 }).limit(24).lean(),
    Metric.find({ serviceId: service._id }).sort({ recordedAt: -1 }).limit(24).lean(),
    DeploymentEvent.find({ serviceId: service._id }).sort({ deployedAt: -1 }).limit(24).lean(),
    ServiceDependency.find({ $or: [{ serviceId: service._id }, { dependsOnServiceId: service._id }] }).lean(),
  ]);

  res.json({
    success: true,
    data: {
      ...service,
      healthScore: computeHealthScore(service),
      checks,
      alerts,
      incidents,
      logs,
      metrics,
      deployments,
      dependencies,
    },
  });
}));

router.patch("/:id", requireAuth, requireRole(["super-admin", "admin"]), asyncHandler(async (req, res) => {
  const workspaceId = workspaceIdFor(req);
  const payload = serviceSchema.partial().parse(req.body);
  if (payload.apiKey) {
    payload.apiKey = encrypt(payload.apiKey);
  }
  const service = await Service.findOneAndUpdate(
    { _id: req.params.id, workspaceId },
    { $set: payload },
    { new: true }
  );
  if (!service) throw new ApiError(404, "Service not found");
  await recordAuditLog({
    workspaceId,
    actorId: req.auth.sub,
    action: "service.update",
    resourceType: "service",
    resourceId: service._id,
    details: payload,
  });
  emitRealtime("service:updated", { serviceId: service._id.toString(), workspaceId, action: "updated" });
  res.json({ success: true, data: service });
}));

router.delete("/:id", requireAuth, requireRole(["super-admin", "admin"]), asyncHandler(async (req, res) => {
  const workspaceId = workspaceIdFor(req);
  const service = await Service.findOneAndDelete({ _id: req.params.id, workspaceId });
  if (!service) throw new ApiError(404, "Service not found");
  await recordAuditLog({
    workspaceId,
    actorId: req.auth.sub,
    action: "service.delete",
    resourceType: "service",
    resourceId: service._id,
    details: { name: service.name },
  });
  emitRealtime("service:updated", { serviceId: service._id.toString(), workspaceId, action: "deleted" });
  try {
    const cascadeResults = await Promise.all([
      CheckResult.deleteMany({ serviceId: service._id }),
      Metric.deleteMany({ serviceId: service._id }),
      LogEntry.deleteMany({ serviceId: service._id }),
      Alert.deleteMany({ serviceId: service._id }),
      AlertRule.deleteMany({ serviceId: service._id }),
      DeploymentEvent.deleteMany({ serviceId: service._id }),
      ServiceDependency.deleteMany({ $or: [{ serviceId: service._id }, { dependsOnServiceId: service._id }] }),
      SLOTarget.deleteMany({ serviceId: service._id }),
    ]);
    
    await recordAuditLog({
      workspaceId,
      actorId: req.auth.sub,
      action: "service.cleanup",
      resourceType: "service",
      resourceId: service._id,
      details: {
        message: "Cascade cleanup executed",
        counts: cascadeResults.map(r => r.deletedCount)
      },
    });
  } catch (err) {
    logger.error("Failed to perform cascade cleanup for service %s: %s", service._id, err.message);
  }

  res.json({ success: true, data: service });
}));

export default router;
