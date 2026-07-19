import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { Alert, AlertRule, Incident } from "../models/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { escalateAlert } from "../services/escalationService.js";
import { emitRealtime } from "../services/realtimeService.js";
import { recordAuditLog } from "../services/auditService.js";
import { resolveWorkspaceId } from "../utils/workspace.js";

const ruleSchema = z.object({
  serviceId: z.string().optional().nullable(),
  name: z.string().min(2),
  type: z.enum(["uptime", "latency", "failure", "status-code", "keyword", "slo-burn"]),
  threshold: z.number(),
  enabled: z.boolean().default(true),
  severity: z.enum(["low", "medium", "high", "critical"]).default("high"),
  notifyChannels: z.array(z.string()).default([]),
});

const alertPatchSchema = z.object({
  status: z.enum(["open", "acknowledged", "resolved", "snoozed", "escalated"]).optional(),
  summary: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
});

const router = Router();

router.get("/rules", requireAuth, asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const rules = await AlertRule.find({ workspaceId }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: rules });
}));

router.post("/rules", requireAuth, requireRole(["super-admin", "admin"]), asyncHandler(async (req, res) => {
  const payload = ruleSchema.parse(req.body);
  const workspaceId = resolveWorkspaceId(req);
  const rule = await AlertRule.create({ ...payload, workspaceId });
  await recordAuditLog({
    workspaceId,
    actorId: req.auth.sub,
    action: "alert_rule.create",
    resourceType: "alert_rule",
    resourceId: rule._id,
    details: { name: rule.name },
  });
  res.status(201).json({ success: true, data: rule });
}));

router.patch("/rules/:id", requireAuth, requireRole(["super-admin", "admin"]), asyncHandler(async (req, res) => {
  const payload = ruleSchema.partial().parse(req.body);
  const workspaceId = resolveWorkspaceId(req);
  const rule = await AlertRule.findOneAndUpdate({ _id: req.params.id, workspaceId }, { $set: payload }, { new: true });
  if (!rule) throw new ApiError(404, "Alert rule not found");
  await recordAuditLog({
    workspaceId,
    actorId: req.auth.sub,
    action: "alert_rule.update",
    resourceType: "alert_rule",
    resourceId: rule._id,
    details: payload,
  });
  res.json({ success: true, data: rule });
}));

router.delete("/rules/:id", requireAuth, requireRole(["super-admin", "admin"]), asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const rule = await AlertRule.findOneAndDelete({ _id: req.params.id, workspaceId });
  if (!rule) throw new ApiError(404, "Alert rule not found");
  await recordAuditLog({
    workspaceId,
    actorId: req.auth.sub,
    action: "alert_rule.delete",
    resourceType: "alert_rule",
    resourceId: rule._id,
    details: { name: rule.name },
  });
  res.json({ success: true, data: rule });
}));

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const filter = { workspaceId };
  if (req.query.serviceId) filter.serviceId = req.query.serviceId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.severity) filter.severity = req.query.severity;
  const alerts = await Alert.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: alerts });
}));

router.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const alert = await Alert.findOne({ _id: req.params.id, workspaceId }).lean();
  if (!alert) throw new ApiError(404, "Alert not found");
  const incident = alert.incidentId ? await Incident.findById(alert.incidentId).lean() : null;
  res.json({ success: true, data: { ...alert, incident } });
}));

router.get("/:id/timeline", requireAuth, asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const alert = await Alert.findOne({ _id: req.params.id, workspaceId }).lean();
  if (!alert) throw new ApiError(404, "Alert not found");
  res.json({
    success: true,
    data: [
      { type: "created", at: alert.createdAt, label: "Alert created" },
      { type: alert.status, at: alert.updatedAt, label: `Alert ${alert.status}` },
      alert.incidentId ? { type: "incident-linked", at: alert.updatedAt, label: "Linked to incident" } : null,
    ].filter(Boolean),
  });
}));

router.patch("/:id", requireAuth, requireRole(["super-admin", "admin", "engineer"]), asyncHandler(async (req, res) => {
  const payload = alertPatchSchema.parse(req.body);
  const workspaceId = resolveWorkspaceId(req);
  const alert = await Alert.findOneAndUpdate({ _id: req.params.id, workspaceId }, { $set: payload }, { new: true });
  if (!alert) throw new ApiError(404, "Alert not found");
  emitRealtime("alert:updated", { alertId: alert._id.toString(), status: alert.status, severity: alert.severity });
  res.json({ success: true, data: alert });
}));

router.post("/:id/ack", requireAuth, requireRole(["super-admin", "admin", "engineer"]), asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const alert = await Alert.findOneAndUpdate({ _id: req.params.id, workspaceId }, { $set: { status: "acknowledged" } }, { new: true });
  if (!alert) throw new ApiError(404, "Alert not found");
  emitRealtime("alert:updated", { alertId: alert._id.toString(), status: alert.status });
  res.json({ success: true, data: alert });
}));

router.post("/:id/resolve", requireAuth, requireRole(["super-admin", "admin", "engineer"]), asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const alert = await Alert.findOneAndUpdate({ _id: req.params.id, workspaceId }, { $set: { status: "resolved" } }, { new: true });
  if (!alert) throw new ApiError(404, "Alert not found");
  emitRealtime("alert:updated", { alertId: alert._id.toString(), status: alert.status });
  res.json({ success: true, data: alert });
}));

router.post("/:id/escalate", requireAuth, requireRole(["super-admin", "admin", "engineer"]), asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const alert = await Alert.findOne({ _id: req.params.id, workspaceId }).lean();
  if (!alert) throw new ApiError(404, "Alert not found");
  const escalated = await escalateAlert(alert, "Manual escalation requested");
  emitRealtime("alert:updated", { alertId: escalated._id.toString(), status: escalated.status });
  res.json({ success: true, data: escalated });
}));

export default router;
