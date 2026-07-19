import { Alert, AlertRule, Incident, ServiceDependency, Service } from "../models/index.js";
import { createWorkspaceNotification } from "./notificationService.js";
import { emitRealtime } from "./realtimeService.js";
import { scheduleEscalation } from "./escalationService.js";

function breached(rule, service) {
  switch (rule.type) {
    case "uptime":
      return (service.uptimePercentage ?? 100) < rule.threshold;
    case "latency":
      return (service.avgLatencyMs ?? 0) > rule.threshold;
    case "failure":
      return (service.failureCount ?? 0) >= rule.threshold;
    case "status-code":
      return (service.lastStatusCode ?? 0) >= rule.threshold;
    case "keyword":
      return (
        Boolean(service.lastCheckSummary) &&
        service.lastCheckSummary
          .toLowerCase()
          .includes(String(rule.threshold).toLowerCase())
      );
    case "slo-burn":
      return (service.errorRate ?? 0) * 100 > rule.threshold;
    default:
      return false;
  }
}

/**
 * Dedup key now includes ruleId to prevent one rule from merging
 * with a different rule that happens to have the same type+threshold.
 * When a rule is not persisted yet, keep the legacy three-part key so
 * ad hoc callers and tests stay stable.
 */
export function buildAlertDedupeKey(serviceId, rule) {
  const ruleId = rule._id ? String(rule._id) : "norule";
  return ruleId === "norule"
    ? `${serviceId}:${rule.type}:${rule.threshold}`
    : `${serviceId}:${rule.type}:${rule.threshold}:${ruleId}`;
}

async function upsertAlert(service, rule) {
  const dedupeKey = buildAlertDedupeKey(service._id, rule);
  const existing = await Alert.findOne({
    dedupeKey,
    status: { $in: ["open", "acknowledged", "escalated"] },
  });
  if (existing) return existing;

  const upstreamDeps = await ServiceDependency.find({
    serviceId: service._id,
  }).lean();

  const upstreamServices = await Service.find({
    _id: { $in: upstreamDeps.map((d) => d.dependsOnServiceId) },
  }).lean();

  const unhealthyUpstreams = upstreamServices.filter(
    (s) => s.healthStatus === "critical" || s.healthStatus === "degraded"
  );

  let summary = `Threshold ${rule.threshold} breached with current service metrics.`;
  if (unhealthyUpstreams.length > 0) {
    const upstreamNames = unhealthyUpstreams.map((s) => s.name).join(", ");
    summary += ` AI Summary: The current failure is likely cascading from upstream dependency failures: ${upstreamNames}.`;
  }

  const alert = await Alert.create({
    workspaceId: service.workspaceId,
    serviceId: service._id,
    ruleId: rule._id,
    title: `${service.name} breached ${rule.type} rule`,
    severity: rule.severity,
    dedupeKey,
    summary,
    meta: {
      threshold: rule.threshold,
      current: {
        uptimePercentage: service.uptimePercentage,
        avgLatencyMs: service.avgLatencyMs,
        failureCount: service.failureCount,
        lastStatusCode: service.lastStatusCode,
        errorRate: service.errorRate,
      },
    },
  });

  const incident = await Incident.create({
    workspaceId: service.workspaceId,
    serviceId: service._id,
    alertIds: [alert._id],
    title: `${service.name} incident`,
    severity: rule.severity,
    summary: `Auto-created from alert ${alert.title}`,
  });

  alert.incidentId = incident._id;
  await alert.save();

  await createWorkspaceNotification({
    workspaceId: service.workspaceId,
    type: "alert.open",
    title: alert.title,
    body: alert.summary,
    meta: {
      alertId: alert._id.toString(),
      incidentId: incident._id.toString(),
    },
  });

  emitRealtime("alert:created", {
    alert,
    incident,
    serviceId: service._id.toString(),
    workspaceId: service.workspaceId.toString(),
  });
  emitRealtime("incident:created", {
    incident,
    alertId: alert._id.toString(),
    serviceId: service._id.toString(),
    workspaceId: service.workspaceId.toString(),
  });
  scheduleEscalation(alert);
  return alert;
}

/**
 * Auto-resolve open alerts for rules that are no longer breached.
 */
async function autoResolveAlerts(service, rules) {
  const openAlerts = await Alert.find({
    serviceId: service._id,
    status: { $in: ["open", "acknowledged"] },
  }).lean();

  const ruleMap = new Map(rules.map((r) => [String(r._id), r]));

  for (const alert of openAlerts) {
    const rule = ruleMap.get(String(alert.ruleId));
    if (!rule) continue;
    if (breached(rule, service)) continue; // still breached

    // Rule is no longer breached — auto-resolve the alert
    await Alert.updateOne(
      { _id: alert._id },
      { $set: { status: "resolved" } }
    );

    emitRealtime("alert:resolved", {
      alertId: alert._id.toString(),
      serviceId: service._id.toString(),
      workspaceId: service.workspaceId.toString(),
      reason: "auto-resolved: threshold no longer breached",
    });
  }
}

export async function evaluateAlertsForService(service) {
  const [serviceRules, workspaceRules] = await Promise.all([
    AlertRule.find({ serviceId: service._id, enabled: true }).lean(),
    AlertRule.find({
      workspaceId: service.workspaceId,
      $or: [{ serviceId: null }, { serviceId: { $exists: false } }],
      enabled: true,
    }).lean(),
  ]);

  const rules = [...serviceRules, ...workspaceRules];

  // Auto-resolve alerts for rules no longer breached
  await autoResolveAlerts(service, rules);

  const alerts = [];
  for (const rule of rules) {
    if (!breached(rule, service)) continue;
    alerts.push(await upsertAlert(service, rule));
  }

  if (alerts.length) {
    emitRealtime("service:alert-breached", {
      serviceId: service._id.toString(),
      workspaceId: service.workspaceId.toString(),
      alertCount: alerts.length,
    });
  }

  return alerts;
}

export { breached as isAlertBreached };
