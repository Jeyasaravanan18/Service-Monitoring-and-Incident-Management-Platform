import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Metric } from "../models/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireIngestionAccess } from "../middleware/ingestionAuth.js";
import { resolveRequestWorkspaceId, resolveWorkspaceId } from "../utils/workspace.js";

const metricSchema = z.object({
  serviceId: z.string().optional().nullable(),
  name: z.string().min(2),
  value: z.number(),
  unit: z.string().optional().default(""),
  recordedAt: z.string().datetime().optional(),
  tags: z.record(z.any()).default({}),
});

const router = Router();

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const filter = { workspaceId: { $in: req.auth.workspaceIds || [] } };
  if (req.query.serviceId) filter.serviceId = req.query.serviceId;
  
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 100));
  const skip = (page - 1) * limit;

  const [metrics, total] = await Promise.all([
    Metric.find(filter).sort({ recordedAt: -1 }).skip(skip).limit(limit).lean(),
    Metric.countDocuments(filter),
  ]);

  res.json({ success: true, data: metrics, meta: { total, page, limit } });
}));

router.post("/", requireIngestionAccess("metrics:write", ["super-admin", "admin", "engineer"]), asyncHandler(async (req, res) => {
  const payload = metricSchema.parse(req.body);
  const workspaceId = resolveRequestWorkspaceId(req);
  const metric = await Metric.create({
    workspaceId,
    ...payload,
    recordedAt: payload.recordedAt ? new Date(payload.recordedAt) : new Date(),
  });
  res.status(201).json({ success: true, data: metric });
}));

export default router;
