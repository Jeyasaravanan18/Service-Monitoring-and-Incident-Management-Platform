import React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Server, BellRing, Flame, Activity } from "lucide-react";
import { apiGet } from "../lib/api.js";
import { useSocketEvent } from "../lib/socket.js";
import { MetricCard } from "../components/MetricCard.jsx";
import { HealthPill } from "../components/HealthPill.jsx";
import { Panel, PageHeader, Topbar } from "../components/Layout.jsx";
import { TelemetryChart } from "../components/TelemetryChart.jsx";
import { AIPanel } from "../components/AIPanel.jsx";
import { DashboardSkeleton } from "../components/Skeleton.jsx";

export function DashboardPage() {
  const [overview, setOverview] = useState({ services: [], alerts: [], incidents: [], logs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const services = overview.services || [];
  const alerts = overview.alerts || [];
  const incidents = overview.incidents || [];
  const logs = overview.logs || [];
  const serviceCount = services.length;
  const openAlerts = alerts.filter((a) => ["open", "acknowledged", "escalated"].includes(a.status)).length;
  const criticalIncidents = incidents.filter((i) => i.severity === "critical").length;
  // Extract the most recently active service's latencyHistory or an aggregate
  const activeService = services.find(s => s.latencyHistory?.length > 0) || services[0];
  const healthTrend = activeService?.latencyHistory || [];
  const avgLatency = serviceCount
    ? Math.round(services.reduce((sum, s) => sum + (s.avgLatencyMs || 0), 0) / serviceCount)
    : 0;

  const [flashingRows, setFlashingRows] = useState({});

  const load = () =>
    apiGet("/dashboard/overview")
      .then((res) => {
        setOverview(res.data || { services: [], alerts: [], incidents: [], logs: [] });
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  const loadRef = React.useRef(load);
  loadRef.current = load;

  const debouncedLoad = React.useMemo(() => {
    let timeout;
    return () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        loadRef.current();
      }, 500);
    };
  }, []);

  useEffect(() => {
    load();
  }, []);

  const handleServiceChecked = React.useCallback((payload) => {
    if (payload?.serviceId) {
      setFlashingRows((prev) => ({ ...prev, [payload.serviceId]: true }));
      setTimeout(() => {
        setFlashingRows((prev) => ({ ...prev, [payload.serviceId]: false }));
      }, 1000);
    }
    debouncedLoad();
  }, [debouncedLoad]);

  // Use shared socket singleton — no new connection on every mount
  useSocketEvent("service:checked", handleServiceChecked);
  useSocketEvent("service:check-failed", handleServiceChecked);
  useSocketEvent("service:updated", debouncedLoad);
  useSocketEvent("alert:created", debouncedLoad);
  useSocketEvent("alert:resolved", debouncedLoad);
  useSocketEvent("incident:created", debouncedLoad);
  useSocketEvent("incident:updated", debouncedLoad);

  const getAIInsight = () => {
    if (criticalIncidents > 0) return `CRITICAL: ${criticalIncidents} active incidents require immediate response. High probability of cascading failure detected.`;
    if (openAlerts > 0) return `WARNING: ${openAlerts} open alerts detected. Correlating telemetry indicates slight latency elevation.`;
    if (serviceCount > 0) return `SYSTEM NORMAL: All ${serviceCount} monitored endpoints are operating within defined service level objectives.`;
    return `INITIALIZING: Awaiting telemetry data. Please configure your first service endpoint.`;
  };

  return (
    <>
      <Topbar />
      <PageHeader
        title="Command center"
        copy="Workspace-wide operational view with service health, alert pressure, incident load, and latency trend context."
        action={<Link className="button primary" to="/app/alert-rules">Initialize Alert Rule</Link>}
      />

      {error ? (
        <div className="alert-banner alert-banner--error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <AIPanel title="SMIMP Copilot Status" status="active">
            {getAIInsight()}
          </AIPanel>
          <div className="grid cols-4">
            <MetricCard
              label="Services"
              value={String(serviceCount)}
              trend={`${services.filter((s) => s.healthStatus === "healthy").length} healthy`}
              icon={Server}
            />
            <MetricCard
              label="Open alerts"
              value={String(openAlerts)}
              trend={`${alerts.length} total tracked`}
              variant={openAlerts > 0 ? "warn" : "default"}
              icon={BellRing}
            />
            <MetricCard
              label="Critical incidents"
              value={String(criticalIncidents)}
              trend={`${incidents.length} total incidents`}
              variant={criticalIncidents > 0 ? "danger" : "default"}
              icon={Flame}
            />
            <MetricCard
              label="Avg latency"
              value={`${avgLatency}ms`}
              trend={`${logs.length} recent log entries`}
              icon={Activity}
            />
          </div>

          <div className="grid cols-2" style={{ marginTop: 16 }}>
            <Panel title="Health trend">
              {healthTrend.length ? (
                <TelemetryChart data={healthTrend} height={180} />
              ) : (
                <div className="subtle">No service health data yet.</div>
              )}
            </Panel>
            <Panel title="Recent incidents">
              <div className="grid" style={{ gap: 10 }}>
                {incidents.slice(0, 3).map((incident) => (
                  <div key={incident._id} className="incident-row">
                    <div className="incident-row__title">
                      <Link to={`/app/incidents/${incident._id}`}>{incident.title}</Link>
                    </div>
                    <div className="incident-row__meta">
                      <span className={`status-badge status-badge--${incident.severity}`}>{incident.severity}</span>
                      <span className="subtle">{incident.status}</span>
                      <span className="subtle">{new Date(incident.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
                {!incidents.length ? <div className="subtle">No incidents. All clear!</div> : null}
              </div>
            </Panel>
          </div>

          <div className="grid cols-2" style={{ marginTop: 16 }}>
            <Panel title="Service health">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Env</th>
                      <th>Status</th>
                      <th>Uptime</th>
                      <th>Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.slice(0, 6).map((service) => (
                      <tr key={service._id} className={flashingRows[service._id] ? "flash-row" : ""} style={{ transition: "background-color 0.5s ease" }}>
                        <td><Link to={`/app/services/${service._id}`}>{service.name}</Link></td>
                        <td><span className="env-badge">{service.environment}</span></td>
                        <td><HealthPill value={service.healthStatus} /></td>
                        <td>{Math.round(service.uptimePercentage || 0)}%</td>
                        <td>{Math.round(service.avgLatencyMs || 0)}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!services.length ? (
                <div className="subtle" style={{ marginTop: 12 }}>No services in this workspace yet.</div>
              ) : null}
            </Panel>

            <Panel title="Recent alerts">
              <div className="grid" style={{ gap: 10 }}>
                {alerts.slice(0, 4).map((alert) => (
                  <div key={alert._id} className="alert-row">
                    <div className="alert-row__content">
                      <span className={`severity-dot severity-dot--${alert.severity}`} />
                      <Link to={`/app/alerts/${alert._id}`}>{alert.title}</Link>
                    </div>
                    <span className={`status-badge status-badge--${alert.status}`}>{alert.status}</span>
                  </div>
                ))}
                {!alerts.length ? <div className="subtle">No active alerts.</div> : null}
              </div>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
