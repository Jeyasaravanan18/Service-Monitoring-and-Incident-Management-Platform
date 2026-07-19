import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { AIInsight, Alert, Incident, LogEntry } from "../models/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { summarizeIncident } from "../services/aiService.js";
import { emitRealtime } from "../services/realtimeService.js";
import { resolveWorkspaceId } from "../utils/workspace.js";

const noteSchema = z.object({
  body: z.string().min(1),
  authorId: z.string().optional(),
});

const incidentSchema = z.object({
  serviceId: z.string().optional().nullable(),
  title: z.string().min(2),
  status: z.enum(["open", "investigating", "monitoring", "resolved", "postmortem"]).default("open"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("high"),
  summary: z.string().optional().default(""),
  rootCauseTag: z.string().optional().default(""),
  ownerId: z.string().optional().nullable(),
  responderIds: z.array(z.string()).default([]),
});

const router = Router();

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const filter = { workspaceId };
  if (req.query.serviceId) filter.serviceId = req.query.serviceId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.severity) filter.severity = req.query.severity;
  const incidents = await Incident.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: incidents });
}));

router.post("/", requireAuth, requireRole(["super-admin", "admin", "engineer"]), asyncHandler(async (req, res) => {
  const payload = incidentSchema.parse(req.body);
  const workspaceId = resolveWorkspaceId(req);
  const incident = await Incident.create({ ...payload, workspaceId });
  res.status(201).json({ success: true, data: incident });
}));

router.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const incident = await Incident.findOne({ _id: req.params.id, workspaceId }).lean();
  if (!incident) throw new ApiError(404, "Incident not found");
  const [alerts, logs, postmortems] = await Promise.all([
    Alert.find({ incidentId: incident._id }).sort({ createdAt: -1 }).lean(),
    LogEntry.find({ incidentId: incident._id }).sort({ occurredAt: -1 }).lean(),
    AIInsight.find({ incidentId: incident._id, type: "postmortem" }).sort({ createdAt: -1 }).lean(),
  ]);
  res.json({ success: true, data: { ...incident, alerts, logs, postmortems } });
}));

router.get("/:id/timeline", requireAuth, asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const incident = await Incident.findOne({ _id: req.params.id, workspaceId }).lean();
  if (!incident) throw new ApiError(404, "Incident not found");
  const timeline = [
    { type: "created", at: incident.createdAt, label: "Incident created" },
    { type: incident.status, at: incident.updatedAt, label: `Status: ${incident.status}` },
    ...(incident.notes || []).map((note) => ({
      type: "note",
      at: note.createdAt,
      label: note.body.slice(0, 120),
    })),
  ]
    .filter((item) => item.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json({ success: true, data: timeline });
}));

router.patch("/:id", requireAuth, requireRole(["super-admin", "admin", "engineer"]), asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const payload = incidentSchema.partial().parse(req.body);
  const incident = await Incident.findOneAndUpdate({ _id: req.params.id, workspaceId }, { $set: payload }, { new: true });
  if (!incident) throw new ApiError(404, "Incident not found");
  emitRealtime("incident:updated", { incidentId: incident._id.toString(), status: incident.status, severity: incident.severity });
  res.json({ success: true, data: incident });
}));

router.post("/:id/notes", requireAuth, requireRole(["super-admin", "admin", "engineer"]), asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const payload = noteSchema.parse(req.body);
  const incident = await Incident.findOne({ _id: req.params.id, workspaceId });
  if (!incident) throw new ApiError(404, "Incident not found");
  if (incident.notes && incident.notes.length >= 500) {
    throw new ApiError(400, "Note limit reached — resolve or archive this incident");
  }
  incident.notes.push({ body: payload.body, authorId: payload.authorId || req.auth.sub, createdAt: new Date() });
  await incident.save();
  emitRealtime("incident:note", { incidentId: incident._id.toString(), note: payload.body.slice(0, 120) });
  res.status(201).json({ success: true, data: incident });
}));

router.post("/:id/resolve", requireAuth, requireRole(["super-admin", "admin", "engineer"]), asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const incident = await Incident.findOneAndUpdate({ _id: req.params.id, workspaceId }, { $set: { status: "resolved" } }, { new: true });
  if (!incident) throw new ApiError(404, "Incident not found");
  emitRealtime("incident:updated", { incidentId: incident._id.toString(), status: incident.status });
  res.json({ success: true, data: incident });
}));

router.post("/:id/postmortem", requireAuth, requireRole(["super-admin", "admin", "engineer"]), asyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  const incident = await Incident.findOne({ _id: req.params.id, workspaceId }).lean();
  if (!incident) throw new ApiError(404, "Incident not found");
  const [alerts, logs] = await Promise.all([
    Alert.find({ incidentId: incident._id }).sort({ createdAt: -1 }).lean(),
    LogEntry.find({ incidentId: incident._id }).sort({ occurredAt: -1 }).lean(),
  ]);
  const draft = await summarizeIncident({ incident, alerts, logs });
  const insight = await AIInsight.create({
    workspaceId: incident.workspaceId,
    serviceId: incident.serviceId,
    incidentId: incident._id,
    type: "postmortem",
    title: `Postmortem draft for ${incident.title}`,
    body: draft,
    evidence: { alerts: alerts.length, logs: logs.length },
  });
  res.status(201).json({ success: true, data: { draft, insight } });
}));

export default router;
