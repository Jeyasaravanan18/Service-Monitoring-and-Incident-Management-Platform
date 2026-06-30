import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_BASE, apiGet, apiPatch, apiPost } from "../lib/api.js";
import { ResourceManagementPage } from "../components/ResourceManagementPage.jsx";
import { LiveDetailPage } from "../components/LiveDetailPage.jsx";
import { HealthPill } from "../components/HealthPill.jsx";
import { MetricCard } from "../components/MetricCard.jsx";
import { Panel, PageHeader, Topbar } from "../components/Layout.jsx";
import { AIPanel } from "../components/AIPanel.jsx";
import { TerminalLogViewer } from "../components/TerminalLogViewer.jsx";
import { TelemetryChart } from "../components/TelemetryChart.jsx";

function useServiceOptions() {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    let mounted = true;
    apiGet("/services").then(res => {
      if (mounted) setOptions((res.data || []).map(s => ({ value: s._id, label: s.name })));
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  return options;
}

function injectServiceOptions(fields, serviceOptions) {
  return fields
    .filter(f => f.key !== "workspaceId")
    .map(f => f.key === "serviceId" ? { ...f, type: "select", options: serviceOptions } : f);
}

const serviceFields = [
  { key: "name", label: "Service name" },
  { key: "url", label: "Health URL" },
  {
    key: "environment",
    label: "Environment",
    type: "select",
    options: [
      { value: "dev", label: "dev" },
      { value: "staging", label: "staging" },
      { value: "prod", label: "prod" },
    ],
  },
  { key: "tags", label: "Tags", type: "array", help: "Comma-separated tags like payments, public-api, tier-1." },
  { key: "maintenanceMode", label: "Maintenance mode", type: "checkbox" },
  { key: "expectedKeyword", label: "Expected keyword" },
  { key: "customHeaders", label: "Custom headers", type: "json", help: "JSON object of headers for protected endpoints." },
  { key: "apiKey", label: "API key" },
  { key: "checkIntervalMinutes", label: "Check interval (minutes)", type: "number" },
];

const serviceColumns = [
  { key: "name", label: "Service" },
  { key: "environment", label: "Env" },
  { key: "healthStatus", label: "Health" },
  { key: "uptimePercentage", label: "Uptime", render: (row) => `${Math.round(row.uptimePercentage || 0)}%` },
  { 
    key: "avgLatencyMs", 
    label: "Latency Trend", 
    render: (row) => (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ minWidth: 40 }}>{Math.round(row.avgLatencyMs || 0)}ms</span>
        <div style={{ width: 60, height: 24, opacity: 0.7 }}>
          <TelemetryChart data={row.latencyHistory || []} height={24} />
        </div>
      </div>
    )
  },
];

const alertRuleFields = [
  { key: "serviceId", label: "Service ID" },
  { key: "name", label: "Rule name" },
  {
    key: "type",
    label: "Rule type",
    type: "select",
    options: [
      { value: "uptime", label: "uptime" },
      { value: "latency", label: "latency" },
      { value: "failure", label: "failure" },
      { value: "status-code", label: "status-code" },
      { value: "keyword", label: "keyword" },
      { value: "slo-burn", label: "slo-burn" },
    ],
  },
  { key: "threshold", label: "Threshold", type: "number" },
  { key: "enabled", label: "Enabled", type: "checkbox" },
  {
    key: "severity",
    label: "Severity",
    type: "select",
    options: [
      { value: "low", label: "low" },
      { value: "medium", label: "medium" },
      { value: "high", label: "high" },
      { value: "critical", label: "critical" },
    ],
  },
  { key: "notifyChannels", label: "Notify channels", type: "array" },
];

const workspaceFields = [
  { key: "name", label: "Workspace name" },
  { key: "slug", label: "Slug" },
  { key: "plan", label: "Plan" },
];

const teamFields = [
  { key: "name", label: "Team name" },
  { key: "memberIds", label: "Member IDs", type: "array" },
];

const maintenanceFields = [
  { key: "serviceId", label: "Service ID" },
  { key: "name", label: "Window name" },
  { key: "startsAt", label: "Starts", type: "date" },
  { key: "endsAt", label: "Ends", type: "date" },
  { key: "reason", label: "Reason", type: "textarea" },
  { key: "active", label: "Active", type: "checkbox" },
];

const statusFields = [
  { key: "title", label: "Title" },
  { key: "subdomain", label: "Subdomain" },
  { key: "public", label: "Public", type: "checkbox" },
  { key: "serviceIds", label: "Service IDs", type: "array" },
];

const sloFields = [
  { key: "serviceId", label: "Service ID" },
  { key: "name", label: "SLO name" },
  { key: "objective", label: "Objective", type: "number" },
  { key: "windowDays", label: "Window days", type: "number" },
  { key: "errorBudgetBurnRate", label: "Burn rate", type: "number" },
];

const viewFields = [
  { key: "userId", label: "User ID" },
  { key: "name", label: "View name" },
  { key: "type", label: "View type" },
  { key: "filters", label: "Filters", type: "json" },
  { key: "pinned", label: "Pinned", type: "checkbox" },
];

const alertFilters = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "open", label: "open" },
      { value: "acknowledged", label: "acknowledged" },
      { value: "resolved", label: "resolved" },
      { value: "snoozed", label: "snoozed" },
      { value: "escalated", label: "escalated" },
    ],
  },
  {
    key: "severity",
    label: "Severity",
    type: "select",
    options: [
      { value: "low", label: "low" },
      { value: "medium", label: "medium" },
      { value: "high", label: "high" },
      { value: "critical", label: "critical" },
    ],
  },
  { key: "serviceId", label: "Service ID" },
];

const incidentFilters = [
  {
    key: "status",
    label: "Lifecycle",
    type: "select",
    options: [
      { value: "open", label: "open" },
      { value: "investigating", label: "investigating" },
      { value: "monitoring", label: "monitoring" },
      { value: "resolved", label: "resolved" },
      { value: "postmortem", label: "postmortem" },
    ],
  },
  {
    key: "severity",
    label: "Severity",
    type: "select",
    options: [
      { value: "low", label: "low" },
      { value: "medium", label: "medium" },
      { value: "high", label: "high" },
      { value: "critical", label: "critical" },
    ],
  },
  { key: "serviceId", label: "Service ID" },
];

const logFilters = [
  { key: "serviceId", label: "Service ID" },
  { key: "severity", label: "Severity", type: "select", options: [
    { value: "debug", label: "debug" },
    { value: "info", label: "info" },
    { value: "warn", label: "warn" },
    { value: "error", label: "error" },
    { value: "critical", label: "critical" },
  ] },
  { key: "environment", label: "Environment", type: "select", options: [
    { value: "dev", label: "dev" },
    { value: "staging", label: "staging" },
    { value: "prod", label: "prod" },
  ] },
  { key: "incidentId", label: "Incident ID" },
  { key: "keyword", label: "Keyword" },
];

function MiniBarChart({ points, labels }) {
  if (!points.length) {
    return <div className="subtle">No time series data available yet.</div>;
  }
  const max = Math.max(...points, 1);
  return (
    <div className="panel" style={{ background: "var(--panel-muted)" }}>
      <div className="button-row" style={{ gap: 8, marginBottom: 8 }}>
        {labels.map((label, index) => (
          <span key={label} className="badge">
            {label}: {points[index]}
          </span>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`, gap: 10, alignItems: "end", minHeight: 140 }}>
        {points.map((point, index) => (
          <div key={`${labels[index]}-${index}`} style={{ display: "grid", gap: 8 }}>
            <div
              style={{
                height: `${Math.max(18, (point / max) * 120)}px`,
                borderRadius: 14,
                background: "var(--green)",
              }}
            />
            <div className="subtle" style={{ textAlign: "center", fontSize: 12 }}>
              {labels[index]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ServicesPage() {
  return (
    <ResourceManagementPage
      title="Services"
      copy="Manage service inventory, URLs, health checks, ownership, and maintenance controls."
      endpoint="/services"
      createLabel="Create service"
      updateLabel="Save service"
      itemLabel="service"
      columns={serviceColumns}
      fields={serviceFields}
      badgeField="healthStatus"
    />
  );
}

export function AlertRulesPage() {
  const serviceOptions = useServiceOptions();
  return (
    <ResourceManagementPage
      title="Alert rules"
      copy="Configure workspace alert policies for uptime, latency, failures, and SLO burn-rate conditions."
      endpoint="/alerts/rules"
      createLabel="Create rule"
      updateLabel="Save rule"
      itemLabel="rule"
      columns={[
        { key: "name", label: "Rule" },
        { key: "type", label: "Type" },
        { key: "threshold", label: "Threshold" },
        { key: "severity", label: "Severity" },
        { key: "enabled", label: "Enabled", render: (row) => (row.enabled ? "Yes" : "No") },
      ]}
      fields={injectServiceOptions(alertRuleFields, serviceOptions)}
    />
  );
}

export function WorkspacesPage() {
  return (
    <ResourceManagementPage
      title="Organization"
      copy="Manage workspaces and workspace-level settings."
      endpoint="/workspaces"
      createLabel="Create workspace"
      updateLabel="Save workspace"
      itemLabel="workspace"
      columns={[
        { key: "name", label: "Workspace" },
        { key: "slug", label: "Slug" },
        { key: "plan", label: "Plan" },
      ]}
      fields={workspaceFields}
    />
  );
}

export function TeamsPage() {
  return (
    <ResourceManagementPage
      title="Teams"
      copy="Manage engineering teams mapped to workspaces and responder ownership."
      endpoint="/teams"
      createLabel="Create team"
      updateLabel="Save team"
      itemLabel="team"
      columns={[
        { key: "name", label: "Team" },
        { key: "workspaceId", label: "Workspace" },
        { key: "memberIds", label: "Members", render: (row) => (row.memberIds || []).length },
      ]}
      fields={teamFields}
    />
  );
}

export function MaintenanceWindowsPage() {
  const serviceOptions = useServiceOptions();
  return (
    <ResourceManagementPage
      title="Maintenance windows"
      copy="Pause alert noise during deploys, maintenance, and planned interventions."
      endpoint="/maintenance"
      createLabel="Create window"
      updateLabel="Save window"
      itemLabel="window"
      columns={[
        { key: "name", label: "Window" },
        { key: "startsAt", label: "Starts", render: (row) => new Date(row.startsAt).toLocaleString() },
        { key: "endsAt", label: "Ends", render: (row) => new Date(row.endsAt).toLocaleString() },
        { key: "active", label: "Active", render: (row) => (row.active ? "Yes" : "No") },
      ]}
      fields={injectServiceOptions(maintenanceFields, serviceOptions)}
    />
  );
}

export function StatusPagesPage() {
  return (
    <ResourceManagementPage
      title="Status pages"
      copy="Configure public or internal status pages for customer-facing service health."
      endpoint="/status"
      createLabel="Create page"
      updateLabel="Save page"
      itemLabel="status page"
      columns={[
        { key: "title", label: "Title" },
        { key: "subdomain", label: "Subdomain" },
        { key: "public", label: "Public", render: (row) => (row.public ? "Yes" : "No") },
      ]}
      fields={statusFields}
    />
  );
}

export function SLOPage() {
  const serviceOptions = useServiceOptions();
  return (
    <ResourceManagementPage
      title="SLO / SLA"
      copy="Track service objectives, error budgets, and burn-rate thresholds."
      endpoint="/slo"
      createLabel="Create target"
      updateLabel="Save target"
      itemLabel="target"
      columns={[
        { key: "name", label: "Target" },
        { key: "objective", label: "Objective" },
        { key: "windowDays", label: "Window" },
        { key: "errorBudgetBurnRate", label: "Burn rate" },
      ]}
      fields={injectServiceOptions(sloFields, serviceOptions)}
    />
  );
}

export function EscalationPoliciesPage() {
  return (
    <ResourceManagementPage
      title="Escalation policies"
      copy="Define automatic escalation ladders for unresolved alerts."
      endpoint="/escalation-policies"
      createLabel="Create policy"
      updateLabel="Save policy"
      itemLabel="policy"
      columns={[
        { key: "name", label: "Policy" },
        { key: "active", label: "Active", render: (row) => (row.active ? "Yes" : "No") },
        { key: "steps", label: "Steps", render: (row) => (row.steps || []).length },
      ]}
      fields={[
        { key: "name", label: "Policy name" },
        { key: "steps", label: "Steps", type: "json", help: "Array of {delayMinutes,targetType,targetId} objects." },
        { key: "active", label: "Active", type: "checkbox" },
      ]}
    />
  );
}

export function SavedViewsPage() {
  return (
    <ResourceManagementPage
      title="Saved views"
      copy="Persist useful filters and curated workspaces for response teams."
      endpoint="/views"
      createLabel="Create view"
      updateLabel="Save view"
      itemLabel="view"
      columns={[
        { key: "name", label: "View" },
        { key: "type", label: "Type" },
        { key: "pinned", label: "Pinned", render: (row) => (row.pinned ? "Yes" : "No") },
      ]}
      fields={viewFields}
    />
  );
}

export function PublicStatusPage() {
  const { subdomain } = useParams();
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    let mounted = true;
    apiGet(`/status/public/${subdomain}`)
      .then((response) => {
        if (!mounted) return;
        setState({ loading: false, error: "", data: response.data || null });
      })
      .catch((error) => {
        if (!mounted) return;
        setState({ loading: false, error: error.message, data: null });
      });
    return () => {
      mounted = false;
    };
  }, [subdomain]);

  // Derive global status
  const services = state.data?.services || [];
  const incidents = state.data?.incidents || [];
  const activeIncidents = incidents.filter(i => ["open", "acknowledged", "escalated"].includes(i.status));
  const degradedServices = services.filter(s => s.healthStatus !== "healthy");
  
  let globalStatus = "operational";
  let globalColor = "var(--color-brand)";
  let globalText = "All Systems Operational";

  if (activeIncidents.length > 0) {
    const isCritical = activeIncidents.some(i => i.severity === "critical");
    globalStatus = isCritical ? "critical" : "degraded";
    globalColor = isCritical ? "var(--color-danger)" : "var(--color-warn)";
    globalText = isCritical ? "Major System Outage" : "Partial System Outage";
  } else if (degradedServices.length > 0) {
    globalStatus = "degraded";
    globalColor = "var(--color-warn)";
    globalText = "Degraded System Performance";
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", padding: "48px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        
        {/* HEADER */}
        <header style={{ marginBottom: 48, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div className="brand-mark" style={{ width: 24, height: 24, background: "var(--color-brand)" }} />
              <h1 style={{ margin: 0, fontSize: 24, letterSpacing: "0.05em" }}>{subdomain.toUpperCase()}</h1>
            </div>
            <p className="subtle">Real-time Service Status</p>
          </div>
          <button className="button" onClick={() => window.location.reload()}>Refresh</button>
        </header>

        {state.loading ? (
          <div className="skeleton" style={{ height: 120, width: "100%", marginBottom: 32 }} />
        ) : state.error ? (
          <div className="panel" style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}>
            Error loading status page: {state.error}
          </div>
        ) : state.data ? (
          <>
            {/* GLOBAL STATUS BANNER */}
            <div 
              className="panel" 
              style={{ 
                marginBottom: 48, 
                background: `rgba(${globalStatus === 'operational' ? '6, 182, 212' : globalStatus === 'critical' ? '239, 68, 68' : '245, 158, 11'}, 0.05)`,
                borderColor: globalColor,
                boxShadow: `0 0 40px rgba(${globalStatus === 'operational' ? '6, 182, 212' : globalStatus === 'critical' ? '239, 68, 68' : '245, 158, 11'}, 0.15)`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "32px 40px"
              }}
            >
              <h2 style={{ fontSize: 28, margin: 0, color: globalColor, textShadow: `0 0 10px ${globalColor}` }}>
                {globalText}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: globalColor, boxShadow: `0 0 10px ${globalColor}` }} className="pulse-glow" />
                <span style={{ color: "var(--color-text-soft)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>LIVE</span>
              </div>
            </div>

            {/* SERVICES UPTIME */}
            <h3 style={{ fontSize: 18, marginBottom: 24, borderBottom: "1px solid var(--color-border-strong)", paddingBottom: 16 }}>System Metrics</h3>
            <div className="panel" style={{ marginBottom: 48, padding: 0, overflow: "hidden" }}>
              {services.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-soft)" }}>No services tracked</div>
              ) : (
                services.map((service, index) => (
                  <div key={service._id} style={{ padding: "24px 32px", borderBottom: index < services.length - 1 ? "1px solid var(--color-border-strong)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <strong style={{ fontSize: 16 }}>{service.name}</strong>
                      <span style={{ 
                        color: service.healthStatus === "healthy" ? "var(--color-brand)" : service.healthStatus === "critical" ? "var(--color-danger)" : "var(--color-warn)",
                        fontFamily: "'JetBrains Mono', monospace"
                      }}>
                        {service.healthStatus === "healthy" ? "Operational" : service.healthStatus === "critical" ? "Outage" : "Degraded"}
                      </span>
                    </div>
                    {/* SIMULATED 90-DAY UPTIME BARS */}
                    <div style={{ display: "flex", gap: 4, height: 32, alignItems: "flex-end" }}>
                      {Array.from({ length: 60 }).map((_, i) => {
                        // Simulate random blips mostly healthy
                        const isBlip = Math.random() > 0.98;
                        const isRecentOutage = service.healthStatus !== "healthy" && i >= 55;
                        const barColor = isRecentOutage ? "var(--color-danger)" : isBlip ? "var(--color-warn)" : "var(--color-brand)";
                        const opacity = isRecentOutage ? 0.8 : isBlip ? 0.6 : 0.3 + (Math.random() * 0.2);
                        return (
                          <div 
                            key={i} 
                            style={{ 
                              flex: 1, 
                              height: isRecentOutage ? "100%" : isBlip ? "80%" : "100%", 
                              background: barColor, 
                              opacity,
                              borderRadius: 2,
                              transition: "all 0.2s ease"
                            }} 
                            title={isRecentOutage ? "Outage" : isBlip ? "Degraded" : "No downtime recorded"}
                          />
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--color-text-soft)", fontFamily: "'JetBrains Mono', monospace" }}>
                      <span>60 days ago</span>
                      <span>{Math.round(service.uptimePercentage || 100)}% uptime</span>
                      <span>Today</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* INCIDENTS */}
            <h3 style={{ fontSize: 18, marginBottom: 24, borderBottom: "1px solid var(--color-border-strong)", paddingBottom: 16 }}>Incident History</h3>
            {incidents.length === 0 ? (
              <div className="subtle" style={{ padding: 32, textAlign: "center", border: "1px dashed var(--color-border-strong)", borderRadius: "var(--radius-md)" }}>
                No incidents reported.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {incidents.map(incident => {
                  const isActive = ["open", "acknowledged", "escalated"].includes(incident.status);
                  const color = incident.severity === "critical" ? "var(--color-danger)" : incident.severity === "high" ? "var(--color-warn)" : "var(--color-brand)";
                  return (
                    <div key={incident._id} className="panel" style={{ borderLeft: `4px solid ${color}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <h4 style={{ margin: 0, fontSize: 18, color: "var(--color-text)" }}>{incident.title}</h4>
                        <span style={{ 
                          padding: "4px 12px", 
                          borderRadius: 100, 
                          fontSize: 12, 
                          fontFamily: "'JetBrains Mono', monospace",
                          background: isActive ? `rgba(${color.replace('var(', '').replace(')', '')}, 0.1)` : "var(--color-surface-alt)",
                          color: isActive ? color : "var(--color-text-soft)",
                          border: `1px solid ${isActive ? color : "var(--color-border-strong)"}`
                        }}>
                          {incident.status.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ color: "var(--color-text-soft)", marginBottom: 16, lineHeight: 1.5 }}>
                        {incident.summary || "We are currently investigating an issue affecting our systems. We will provide updates as more information becomes available."}
                      </p>
                      <div className="subtle" style={{ fontSize: 12 }}>
                        Reported on {new Date(incident.createdAt).toLocaleDateString()} at {new Date(incident.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            
            {/* FOOTER */}
            <footer style={{ marginTop: 80, paddingTop: 32, borderTop: "1px solid var(--color-border-strong)", textAlign: "center", color: "var(--color-text-soft)", fontSize: 13 }}>
              Powered by <span style={{ color: "var(--color-brand)", letterSpacing: "0.1em" }}>SMIMP</span>
            </footer>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function AlertsPage() {
  const serviceOptions = useServiceOptions();
  return (
    <ResourceManagementPage
      title="Alerts"
      copy="Read live alert records, then open a detail page for actions and incident correlation."
      endpoint="/alerts"
      itemLabel="alert"
      disableCreate
      disableEdit
      disableDelete
      listFilters={injectServiceOptions(alertFilters, serviceOptions)}
      columns={[
        { key: "title", label: "Alert", render: (row) => <Link to={`/app/alerts/${row._id}`}>{row.title}</Link> },
        { key: "severity", label: "Severity" },
        { key: "status", label: "State" },
        { key: "summary", label: "Summary" },
      ]}
      fields={[]}
      badgeField="severity"
    />
  );
}

export function DeploymentsPage() {
  const serviceOptions = useServiceOptions();
  return (
    <ResourceManagementPage
      title="Deployments"
      copy="Track release markers that can be correlated with incidents, alerts, and service health shifts."
      endpoint="/deployments"
      createLabel="Create deploy marker"
      updateLabel="Save deploy marker"
      itemLabel="deployment"
      columns={[
        { key: "title", label: "Deploy" },
        { key: "environment", label: "Env" },
        { key: "sha", label: "SHA" },
        { key: "deployedAt", label: "Deployed", render: (row) => new Date(row.deployedAt).toLocaleString() },
      ]}
      fields={injectServiceOptions([
        { key: "serviceId", label: "Service ID" },
        { key: "title", label: "Deploy title" },
        {
          key: "environment",
          label: "Environment",
          type: "select",
          options: [
            { value: "dev", label: "dev" },
            { value: "staging", label: "staging" },
            { value: "prod", label: "prod" },
          ],
        },
        { key: "sha", label: "Commit SHA" },
        { key: "deployedAt", label: "Deployed at", type: "date" },
        { key: "metadata", label: "Metadata", type: "json", help: "Additional deploy metadata." },
      ], serviceOptions)}
    />
  );
}

export function MetricsPage() {
  const serviceOptions = useServiceOptions();
  return (
    <ResourceManagementPage
      title="Metrics"
      copy="Ingest and review custom operational metrics and service-level measures."
      endpoint="/metrics"
      createLabel="Add metric"
      updateLabel="Save metric"
      itemLabel="metric"
      columns={[
        { key: "name", label: "Metric" },
        { key: "value", label: "Value" },
        { key: "unit", label: "Unit" },
        { key: "recordedAt", label: "Recorded", render: (row) => new Date(row.recordedAt).toLocaleString() },
      ]}
      fields={injectServiceOptions([
        { key: "serviceId", label: "Service ID" },
        { key: "name", label: "Metric name" },
        { key: "value", label: "Value", type: "number" },
        { key: "unit", label: "Unit" },
        { key: "recordedAt", label: "Recorded at", type: "date" },
        { key: "tags", label: "Tags", type: "json", help: "JSON object of metric dimensions." },
      ], serviceOptions)}
    />
  );
}

export function IncidentsPage() {
  const serviceOptions = useServiceOptions();
  return (
    <ResourceManagementPage
      title="Incidents"
      copy="Track investigations, severity, lifecycle state, and root-cause tags."
      endpoint="/incidents"
      itemLabel="incident"
      disableCreate
      disableEdit
      disableDelete
      listFilters={injectServiceOptions(incidentFilters, serviceOptions)}
      columns={[
        { key: "title", label: "Incident", render: (row) => <Link to={`/app/incidents/${row._id}`}>{row.title}</Link> },
        { key: "severity", label: "Severity" },
        { key: "status", label: "Lifecycle" },
        { key: "rootCauseTag", label: "Root cause" },
      ]}
      fields={[]}
      badgeField="severity"
    />
  );
}

export function LogsPage() {
  return <TerminalLogViewer />;
}

export function AuditLogsPage() {
  const [state, setState] = useState({ loading: true, error: "", data: [] });
  const [filters, setFilters] = useState({ action: "", resourceType: "", actorId: "" });

  const refresh = (activeFilters = filters) => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    const params = new URLSearchParams();
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    apiGet(params.toString() ? `/audit?${params.toString()}` : "/audit")
      .then((response) => setState({ loading: false, error: "", data: response.data || [] }))
      .catch((error) => setState({ loading: false, error: error.message, data: [] }));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCsv = async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const session = JSON.parse(localStorage.getItem("smimp-session") || "null");
    const headers = {};
    if (session?.token) headers.Authorization = `Bearer ${session.token}`;
    if (session?.workspaceId) headers["X-Workspace-Id"] = session.workspaceId;
    const response = await fetch(`${API_BASE}/audit/export${params.toString() ? `?${params.toString()}` : ""}`, { headers });
    if (!response.ok) throw new Error("Failed to export audit logs");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "audit-logs.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const rows = state.data || [];
    return [
      { label: "Entries", value: String(rows.length), trend: "Recent activity" },
      { label: "Actions", value: String(new Set(rows.map((item) => item.action)).size), trend: "Unique actions" },
      { label: "Resources", value: String(new Set(rows.map((item) => item.resourceType)).size), trend: "Tracked objects" },
    ];
  }, [state.data]);

  return (
    <>
      <Topbar />
      <PageHeader
        title="Audit logs"
        copy="Immutable history for sensitive actions and admin-level changes."
        action={
          <div className="button-row">
            <button className="button" onClick={() => refresh()}>Refresh</button>
            <button className="button" onClick={exportCsv}>Export CSV</button>
          </div>
        }
      />
      <div className="grid cols-3">
        {stats.map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} trend={item.trend} />
        ))}
      </div>
      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <Panel title="Filters">
          <div className="grid" style={{ gap: 12 }}>
            <input className="search" placeholder="Action" value={filters.action} onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))} />
            <input className="search" placeholder="Resource type" value={filters.resourceType} onChange={(event) => setFilters((current) => ({ ...current, resourceType: event.target.value }))} />
            <input className="search" placeholder="Actor ID" value={filters.actorId} onChange={(event) => setFilters((current) => ({ ...current, actorId: event.target.value }))} />
            <div className="button-row">
              <button className="button primary" onClick={() => refresh(filters)}>Apply</button>
              <button className="button" onClick={() => { const next = { action: "", resourceType: "", actorId: "" }; setFilters(next); refresh(next); }}>Clear</button>
            </div>
          </div>
        </Panel>
        <Panel title="Scope">
          <div className="subtle">
            Workspace-scoped audit trail for service changes, workspace updates, and responder actions.
          </div>
        </Panel>
      </div>
      <div style={{ marginTop: 16 }}>
        <Panel title="Activity feed">
          {state.loading ? <div className="subtle">Loading audit trail...</div> : null}
          {state.error ? <div className="subtle">{state.error}</div> : null}
          {!state.loading && !state.error ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Resource ID</th>
                  <th>Actor</th>
                  <th>Observed</th>
                </tr>
              </thead>
              <tbody>
                {(state.data || []).map((row) => (
                  <tr key={row._id}>
                    <td>{row.action}</td>
                    <td>{row.resourceType}</td>
                    <td>{row.resourceId}</td>
                    <td>{row.actorId}</td>
                    <td>{new Date(row.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </Panel>
      </div>
    </>
  );
}

export function NotificationsPage() {
  const [state, setState] = useState({ loading: true, error: "", data: [] });
  const [integrations, setIntegrations] = useState(null);

  const refresh = () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    Promise.all([apiGet("/notifications"), apiGet("/integrations")])
      .then(([notificationsResponse, integrationsResponse]) => {
        setState({ loading: false, error: "", data: notificationsResponse.data || [] });
        setIntegrations(integrationsResponse.data || null);
      })
      .catch((error) => setState({ loading: false, error: error.message, data: [] }));
  };

  useEffect(() => {
    refresh();
  }, []);

  const markRead = async (id) => {
    await apiPatch(`/notifications/${id}`, { readAt: new Date().toISOString() });
    refresh();
  };

  const markAllRead = async () => {
    await apiPatch("/notifications/read-all", {});
    refresh();
  };

  const unreadCount = (state.data || []).filter((notification) => !notification.readAt).length;
  const deliveryAttempts = (state.data || [])
    .flatMap((notification) => (notification.meta?.deliveryResults || []).map((result) => ({ ...result, title: notification.title })))
    .slice(0, 8);

  return (
    <>
      <Topbar />
      <PageHeader
        title="Notifications"
        copy="In-app notifications plus outbound delivery status for email, webhook, and Slack."
        action={
          <div className="button-row">
            <button className="button" onClick={refresh}>Refresh</button>
            <button className="button" onClick={markAllRead}>Mark all read</button>
          </div>
        }
      />
      <div className="grid cols-3">
        <MetricCard label="Unread" value={String(unreadCount)} trend="Requires attention" />
        <MetricCard label="Notifications" value={String((state.data || []).length)} trend="Current workspace" />
        <MetricCard label="Delivery attempts" value={String(deliveryAttempts.length)} trend="Tracked outbound sends" />
      </div>
      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <Panel title="Channel health">
          {integrations ? (
            <div className="grid" style={{ gap: 12 }}>
              <div className="panel" style={{ background: "rgba(255,255,255,0.03)" }}>
                <strong>Webhook</strong>
                <div className="subtle">{integrations.webhooks?.length ? "Configured" : "Not configured"}</div>
              </div>
              <div className="panel" style={{ background: "rgba(255,255,255,0.03)" }}>
                <strong>Slack</strong>
                <div className="subtle">{integrations.slack?.ready ? "Ready" : integrations.slack?.note || "Not configured"}</div>
              </div>
              <div className="panel" style={{ background: "rgba(255,255,255,0.03)" }}>
                <strong>Email</strong>
                <div className="subtle">Add `RESEND_API_KEY` and `NOTIFICATION_EMAIL_FROM` to enable outbound email delivery.</div>
              </div>
            </div>
          ) : (
            <div className="subtle">Loading delivery channels...</div>
          )}
        </Panel>
        <Panel title="Delivery attempts">
          {deliveryAttempts.length ? (
            <div className="grid" style={{ gap: 10 }}>
              {deliveryAttempts.map((item, index) => (
                <div key={`${item.channel}-${index}`} className="panel" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div>{item.title}</div>
                  <div className="subtle">{item.channel} - {item.ok ? "delivered" : item.skipped ? "skipped" : "failed"}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="subtle">No outbound attempts yet.</div>
          )}
        </Panel>
      </div>
      <div style={{ marginTop: 16 }}>
        <Panel title="Inbox">
          {state.loading ? <div className="subtle">Loading notifications...</div> : null}
          {state.error ? <div className="subtle">{state.error}</div> : null}
          {!state.loading && !state.error ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Body</th>
                  <th>Status</th>
                  <th>Delivery</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {state.data.map((notification) => (
                  <tr key={notification._id}>
                    <td>{notification.title}</td>
                    <td>{notification.type}</td>
                    <td>{notification.body || "-"}</td>
                    <td>{notification.readAt ? "Read" : "Unread"}</td>
                    <td>{(notification.meta?.deliveryResults || []).length ? `${notification.meta.deliveryResults.length} attempts` : "In-app only"}</td>
                    <td>
                      {!notification.readAt ? (
                        <button className="button" onClick={() => markRead(notification._id)}>
                          Mark read
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </Panel>
      </div>
    </>
  );
}

export function IntegrationPage() {
  return (
    <ResourceManagementPage
      title="Integrations and API keys"
      copy="Manage ingestion keys and integration credentials for external systems."
      endpoint="/api-keys"
      createLabel="Create API key"
      updateLabel="Save API key"
      itemLabel="API key"
      columns={[
        { key: "name", label: "Key name" },
        { key: "scopes", label: "Scopes", render: (row) => (row.scopes || []).join(", ") || "-" },
        { key: "keyHash", label: "Key hash" },
        { key: "lastUsedAt", label: "Last used", render: (row) => (row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : "-") },
      ]}
      fields={[
        { key: "workspaceId", label: "Workspace ID" },
        { key: "name", label: "Key name" },
        { key: "scopes", label: "Scopes", type: "array", help: "Comma-separated scopes such as logs:write, metrics:write." },
      ]}
    />
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState({ services: [], alerts: [], incidents: [], logs: [] });
  const [workspaces, setWorkspaces] = useState([]);
  const session = JSON.parse(localStorage.getItem("smimp-session") || "null");
  const user = session?.user;
  const activeWorkspaceId = session?.workspaceId || user?.workspaceIds?.[0] || null;

  useEffect(() => {
    apiGet("/dashboard/overview").then((response) => setOverview(response.data || { services: [], alerts: [], incidents: [], logs: [] }));
    apiGet("/workspaces").then((response) => setWorkspaces(response.data || [])).catch(() => setWorkspaces([]));
  }, []);

  const services = overview.services || [];
  const alerts = overview.alerts || [];
  const incidents = overview.incidents || [];
  const metrics = [
    { label: "Workspaces", value: String(workspaces.length || user?.workspaceIds?.length || 0), trend: activeWorkspaceId ? `Active ${String(activeWorkspaceId).slice(-6)}` : "No workspace selected" },
    { label: "Services", value: String(services.length), trend: `${services.filter((service) => service.healthStatus === "healthy").length} healthy` },
    { label: "Open alerts", value: String(alerts.filter((alert) => ["open", "acknowledged", "escalated"].includes(alert.status)).length), trend: `${alerts.length} total alerts` },
    { label: "Critical incidents", value: String(incidents.filter((incident) => incident.severity === "critical").length), trend: `${incidents.length} tracked incidents` },
  ];

  return (
    <>
      <Topbar />
      <PageHeader
        title="Profile"
        copy="Review the active user session and personal workspace context."
        action={<button className="button primary" onClick={() => navigate("/auth/login")}>Switch account</button>}
      />
      <div className="grid cols-3">
        {metrics.map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} trend={item.trend} />
        ))}
      </div>
      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <Panel title="Current session">
          <div className="grid" style={{ gap: 10 }}>
            <div>Name: {user?.name || "Unknown"}</div>
            <div>Email: {user?.email || "Unknown"}</div>
            <div>Roles: {(user?.roles || []).join(", ") || "-"}</div>
            <div>Workspace role: {(user?.workspaceRoles || []).find((item) => String(item.workspaceId) === String(activeWorkspaceId))?.role || user?.roles?.[0] || "viewer"}</div>
            <div>Workspace IDs: {(user?.workspaceIds || []).join(", ") || "-"}</div>
            <div>Email verified: {user?.emailVerifiedAt ? new Date(user.emailVerifiedAt).toLocaleString() : "Not verified yet"}</div>
          </div>
        </Panel>
        <Panel title="Security notes">
          <div className="subtle">
            Password reset, email verification, and token refresh flows are available on this account. Logout revokes the refresh token locally and server-side.
          </div>
        </Panel>
      </div>
    </>
  );
}

export function ServiceDetailPage() {
  const { id } = useParams();
  return (
    <LiveDetailPage
      title="Service detail"
      copy="Live service health, checks, alerts, incidents, logs, and release markers."
      endpoint={`/services/${id}`}
      aiAnalysis={(service) => {
        if (service.healthStatus === "healthy") return "Service telemetry is optimal. No anomalous patterns detected in latency or error rates over the last 24 hours.";
        if (service.healthStatus === "degraded") return "WARNING: Service showing degraded performance. Elevated latency detected. Consider scaling resources or reviewing recent deployments.";
        return "CRITICAL: Service failing health checks. Immediate investigation required. Root cause likely network timeout or upstream dependency failure.";
      }}
      summaryFields={[
        { key: "healthScore", label: "Health score", render: (service) => `${Math.round(service.healthScore || 0)}/100` },
        { key: "uptimePercentage", label: "Uptime", render: (service) => `${Math.round(service.uptimePercentage || 0)}%` },
        { key: "avgLatencyMs", label: "Latency", render: (service) => `${Math.round(service.avgLatencyMs || 0)}ms` },
        { key: "errorRate", label: "Error rate", render: (service) => `${Math.round((service.errorRate || 0) * 100)}%` },
      ]}
      detailFields={[
        { key: "url", label: "URL" },
        { key: "environment", label: "Environment" },
        { key: "tags", label: "Tags" },
        { key: "maintenanceMode", label: "Maintenance mode" },
        { key: "expectedKeyword", label: "Expected keyword" },
        { key: "checkIntervalMinutes", label: "Check interval" },
        { key: "failureCount", label: "Failure count" },
        { key: "lastStatusCode", label: "Last status" },
        { key: "lastResponseTimeMs", label: "Last response time" },
        { key: "lastCheckSummary", label: "Last check summary" },
      ]}
      tables={[
        {
          title: "Recent checks",
          dataKey: "checks",
          columns: [
            { key: "checkedAt", label: "Checked", render: (row) => new Date(row.checkedAt).toLocaleString() },
            { key: "statusCode", label: "Status" },
            { key: "latencyMs", label: "Latency", render: (row) => `${row.latencyMs}ms` },
            { key: "ok", label: "Result", render: (row) => (row.ok ? "Pass" : "Fail") },
          ],
        },
        {
          title: "Alerts",
          dataKey: "alerts",
          columns: [
            { key: "title", label: "Alert" },
            { key: "severity", label: "Severity" },
            { key: "status", label: "State" },
          ],
          badgeField: "severity",
        },
        {
          title: "Incidents",
          dataKey: "incidents",
          columns: [
            { key: "title", label: "Incident" },
            { key: "severity", label: "Severity" },
            { key: "status", label: "Lifecycle" },
          ],
          badgeField: "severity",
        },
        {
          title: "Logs",
          dataKey: "logs",
          columns: [
            { key: "severity", label: "Severity" },
            { key: "message", label: "Message" },
            { key: "occurredAt", label: "Observed", render: (row) => new Date(row.occurredAt).toLocaleString() },
          ],
          badgeField: "severity",
        },
        {
          title: "Metrics",
          dataKey: "metrics",
          columns: [
            { key: "name", label: "Metric" },
            { key: "value", label: "Value" },
            { key: "recordedAt", label: "Recorded", render: (row) => new Date(row.recordedAt).toLocaleString() },
          ],
        },
        {
          title: "Deployments",
          dataKey: "deployments",
          columns: [
            { key: "title", label: "Deploy" },
            { key: "environment", label: "Env" },
            { key: "deployedAt", label: "Deployed", render: (row) => new Date(row.deployedAt).toLocaleString() },
          ],
        },
        {
          title: "Dependencies",
          dataKey: "dependencies",
          columns: [
            { key: "serviceId", label: "Service ID" },
            { key: "dependsOnServiceId", label: "Depends on" },
            { key: "relationType", label: "Relation" },
          ],
        },
      ]}
    />
  );
}

export function AlertDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [timeline, setTimeline] = useState([]);

  const refresh = () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    Promise.all([apiGet(`/alerts/${id}`), apiGet(`/alerts/${id}/timeline`)])
      .then(([alertResponse, timelineResponse]) => {
        setState({ loading: false, error: "", data: alertResponse.data || null });
        setTimeline(timelineResponse.data || []);
      })
      .catch((error) => setState({ loading: false, error: error.message, data: null }));
  };

  useEffect(() => {
    refresh();
  }, [id]);

  const updateStatus = async (status) => {
    await apiPatch(`/alerts/${id}`, { status });
    refresh();
  };

  return (
    <>
      <Topbar />
      <PageHeader
        title="Alert detail"
        copy="Review alert state, severity, and incident linkage."
        action={
          <div className="button-row">
            <button className="button" onClick={() => updateStatus("acknowledged")}>Acknowledge</button>
            <button className="button" onClick={() => updateStatus("resolved")}>Resolve</button>
            <button className="button" onClick={refresh}>Refresh</button>
          </div>
        }
      />
      {state.loading ? <Panel title="Loading">Loading alert...</Panel> : null}
      {state.error ? <Panel title="Error">{state.error}</Panel> : null}
      {state.data ? (
        <>
          <div className="grid cols-2">
            <Panel title="Alert summary">
              <div className="grid" style={{ gap: 10 }}>
                <div>Title: {state.data.title}</div>
                <div>Status: {state.data.status}</div>
                <div>Severity: {state.data.severity}</div>
                <div>Summary: {state.data.summary || "-"}</div>
                <div>Dedupe key: {state.data.dedupeKey || "-"}</div>
                <div>Incident: {state.data.incident?.title || "Not linked"}</div>
              </div>
            </Panel>
            <Panel title="Meta">
              <pre style={{ whiteSpace: "pre-wrap", margin: 0, color: "var(--muted)" }}>{JSON.stringify(state.data.meta || {}, null, 2)}</pre>
            </Panel>
          </div>
          <div style={{ marginTop: 16 }}>
            <Panel title="Timeline">
              <div className="grid" style={{ gap: 10 }}>
                {timeline.map((entry) => (
                  <div key={`${entry.type}-${entry.at}`} className="panel" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div>{entry.label}</div>
                    <div className="subtle">{entry.type} - {new Date(entry.at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      ) : null}
    </>
  );
}

export function IncidentDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [note, setNote] = useState("");
  const [timeline, setTimeline] = useState([]);
  const [generatingPostmortem, setGeneratingPostmortem] = useState(false);

  const refresh = () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    Promise.all([apiGet(`/incidents/${id}`), apiGet(`/incidents/${id}/timeline`)])
      .then(([incidentResponse, timelineResponse]) => {
        setState({ loading: false, error: "", data: incidentResponse.data || null });
        setTimeline(timelineResponse.data || []);
      })
      .catch((error) => setState({ loading: false, error: error.message, data: null }));
  };

  useEffect(() => {
    refresh();
  }, [id]);

  const resolve = async () => {
    await apiPost(`/incidents/${id}/resolve`, {});
    refresh();
  };

  const addNote = async () => {
    if (!note.trim()) return;
    await apiPost(`/incidents/${id}/notes`, { body: note });
    setNote("");
    refresh();
  };

  const generatePostmortem = async () => {
    try {
      setGeneratingPostmortem(true);
      await apiPost(`/incidents/${id}/postmortem`, {});
      await refresh();
    } finally {
      setGeneratingPostmortem(false);
    }
  };

  return (
    <>
      <Topbar />
      <PageHeader
        title="Incident detail"
        copy="Track lifecycle, responder notes, AI draft generation, and correlated alerts."
        action={
          <div className="button-row">
            <button className="button" onClick={resolve}>Resolve</button>
            <button className="button" onClick={generatePostmortem} disabled={generatingPostmortem}>
              {generatingPostmortem ? "Generating..." : "Generate postmortem"}
            </button>
            <button className="button" onClick={refresh}>Refresh</button>
          </div>
        }
      />
      {state.loading ? <Panel title="Loading">Loading incident...</Panel> : null}
      {state.error ? <Panel title="Error">{state.error}</Panel> : null}
      {state.data ? (
        <>
          {state.data.postmortems && state.data.postmortems.length > 0 ? (
            <AIPanel title={`SMIMP AI - Postmortem Analysis`} status="active">
              {state.data.postmortems[0].body}
            </AIPanel>
          ) : (
            <AIPanel title={`SMIMP AI - Root Cause Diagnostic`} status={generatingPostmortem ? "analyzing" : "active"}>
              {generatingPostmortem 
                ? "Synthesizing logs and alerts..." 
                : "No AI postmortem has been generated for this incident yet. Click 'Generate postmortem' to synthesize logs and alerts into a report."}
            </AIPanel>
          )}
          <div className="grid cols-4" style={{ marginBottom: 16 }}>
            <MetricCard label="Severity" value={state.data.severity} trend={state.data.status} />
            <MetricCard label="Alerts" value={String((state.data.alerts || []).length)} trend="Correlated alerts" />
            <MetricCard label="Logs" value={String((state.data.logs || []).length)} trend="Recent logs" />
            <MetricCard label="Notes" value={String((state.data.notes || []).length)} trend="Responder notes" />
          </div>
          <div className="grid cols-2">
            <Panel title="Incident summary">
              <div className="grid" style={{ gap: 10 }}>
                <div>Title: {state.data.title}</div>
                <div>Status: {state.data.status}</div>
                <div>Severity: {state.data.severity}</div>
                <div>Root cause tag: {state.data.rootCauseTag || "-"}</div>
                <div>Summary: {state.data.summary || "-"}</div>
              </div>
            </Panel>
            <Panel title="Add note">
              <textarea className="search" rows={6} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write a response note..." />
              <div className="button-row" style={{ marginTop: 12 }}>
                <button className="button primary" onClick={addNote}>Add note</button>
              </div>
            </Panel>
          </div>
          <div className="grid cols-2" style={{ marginTop: 16 }}>
            <Panel title="Related alerts">
              {(state.data.alerts || []).length ? (
                <div className="grid" style={{ gap: 10 }}>
                  {state.data.alerts.map((alert) => (
                    <div key={alert._id} className="panel" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <Link to={`/app/alerts/${alert._id}`}>{alert.title}</Link>
                      <div className="subtle">{alert.severity} - {alert.status}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="subtle">No related alerts.</div>
              )}
            </Panel>
            <Panel title="Logs">
              {(state.data.logs || []).length ? (
                <div className="grid" style={{ gap: 10 }}>
                  {state.data.logs.slice(0, 5).map((log) => (
                    <div key={log._id} className="panel" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <div>{log.message}</div>
                      <div className="subtle">{log.severity} - {new Date(log.occurredAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="subtle">No correlated logs.</div>
              )}
            </Panel>
          </div>
          <div style={{ marginTop: 16 }}>
            <Panel title="Timeline">
              <div className="grid" style={{ gap: 10 }}>
                {timeline.map((entry) => (
                  <div key={`${entry.type}-${entry.at}`} className="panel" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div>{entry.label}</div>
                    <div className="subtle">{entry.type} - {new Date(entry.at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      ) : null}
    </>
  );
}

export function AnalyticsPage() {
  const [overview, setOverview] = useState({ services: [], alerts: [], incidents: [], logs: [] });

  useEffect(() => {
    apiGet("/dashboard/overview").then((response) => setOverview(response.data || { services: [], alerts: [], incidents: [], logs: [] }));
  }, []);

  const serviceHealth = overview.services || [];
  const uptimeSeries = serviceHealth.slice(0, 5).map((service) => Math.round(service.uptimePercentage || 0));
  const latencySeries = serviceHealth.slice(0, 5).map((service) => Math.round(service.avgLatencyMs || 0));
  const healthSeries = serviceHealth.slice(0, 5).map((service) => Math.round(service.healthScore || 0));
  const chartLabels = serviceHealth.slice(0, 5).map((service) => service.name);
  const alertVolume = [
    (overview.alerts || []).filter((alert) => alert.status === "open").length,
    (overview.alerts || []).filter((alert) => alert.status === "acknowledged").length,
    (overview.alerts || []).filter((alert) => alert.status === "resolved").length,
    (overview.alerts || []).filter((alert) => alert.status === "escalated").length,
  ];
  const criticalIncidents = (overview.incidents || []).filter((incident) => incident.severity === "critical").length;
  const openAlerts = (overview.alerts || []).filter((alert) => ["open", "acknowledged", "escalated"].includes(alert.status)).length;
  const avgLatency = serviceHealth.length
    ? Math.round(serviceHealth.reduce((sum, service) => sum + (service.avgLatencyMs || 0), 0) / serviceHealth.length)
    : 0;

  return (
    <>
      <Topbar />
      <PageHeader title="Analytics" copy="Trend service health, alert load, and incident volume with live workspace data." />
      <div className="grid cols-4">
        <MetricCard label="Services" value={String(serviceHealth.length)} trend={`${serviceHealth.filter((service) => service.healthStatus === "healthy").length} healthy`} />
        <MetricCard label="Open alerts" value={String(openAlerts)} trend={`${(overview.alerts || []).length} tracked`} />
        <MetricCard label="Critical incidents" value={String(criticalIncidents)} trend={`${(overview.incidents || []).length} total incidents`} />
        <MetricCard label="Avg latency" value={`${avgLatency}ms`} trend={`${(overview.logs || []).length} recent log entries`} />
      </div>
      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <Panel title="Service uptime">
          <MiniBarChart points={uptimeSeries} labels={chartLabels} />
        </Panel>
        <Panel title="Service latency">
          <MiniBarChart points={latencySeries} labels={chartLabels} />
        </Panel>
      </div>
      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <Panel title="Health score">
          <MiniBarChart points={healthSeries} labels={chartLabels} />
        </Panel>
        <Panel title="Alert lifecycle">
          <MiniBarChart points={alertVolume} labels={["Open", "Ack", "Resolved", "Escalated"]} />
        </Panel>
      </div>
      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <Panel title="Recent incidents">
          {(overview.incidents || []).slice(0, 5).map((incident) => (
            <div key={incident._id} className="panel" style={{ background: "var(--panel-muted)", marginBottom: 10 }}>
              <Link to={`/app/incidents/${incident._id}`}>{incident.title}</Link>
              <div className="subtle">{incident.status} · {incident.severity}</div>
            </div>
          ))}
          {!overview.incidents?.length ? <div className="subtle">No incident data in this workspace yet.</div> : null}
        </Panel>
        <Panel title="Recent alerts">
          {(overview.alerts || []).slice(0, 5).map((alert) => (
            <div key={alert._id} className="panel" style={{ background: "var(--panel-muted)", marginBottom: 10 }}>
              <Link to={`/app/alerts/${alert._id}`}>{alert.title}</Link>
              <div className="subtle">{alert.status} · {alert.severity}</div>
            </div>
          ))}
          {!overview.alerts?.length ? <div className="subtle">No alert data in this workspace yet.</div> : null}
        </Panel>
      </div>
    </>
  );
}

export function DependencyGraphPage() {
  const [services, setServices] = useState([]);
  const [dependencies, setDependencies] = useState([]);

  useEffect(() => {
    Promise.all([apiGet("/services"), apiGet("/dependencies")]).then(([servicesResponse, dependencyResponse]) => {
      setServices(servicesResponse.data || []);
      setDependencies(dependencyResponse.data || []);
    });
  }, []);

  const graph = useMemo(() => {
    const nodes = services.map((service, index) => ({
      ...service,
      x: 80 + (index % 3) * 260,
      y: 90 + Math.floor(index / 3) * 140,
    }));
    const nodeMap = new Map(nodes.map((node) => [String(node._id), node]));
    const edges = dependencies
      .map((dependency) => ({
        source: nodeMap.get(String(dependency.serviceId)),
        target: nodeMap.get(String(dependency.dependsOnServiceId)),
        relationType: dependency.relationType || "hard",
      }))
      .filter((edge) => edge.source && edge.target);
    return { nodes, edges };
  }, [services, dependencies]);

  return (
    <>
      <Topbar />
      <PageHeader title="Dependency graph" copy="A live topology map of service relationships and dependency edges." />
      <Panel title="Topology map">
        {graph.nodes.length ? (
          <div style={{ overflowX: "auto" }}>
            <svg width={920} height={Math.max(260, Math.ceil(graph.nodes.length / 3) * 150)} viewBox={`0 0 920 ${Math.max(260, Math.ceil(graph.nodes.length / 3) * 150)}`}>
              {graph.edges.map((edge, index) => (
                <line
                  key={`${edge.source._id}-${edge.target._id}-${index}`}
                  x1={edge.source.x + 90}
                  y1={edge.source.y + 28}
                  x2={edge.target.x + 90}
                  y2={edge.target.y + 28}
                  stroke="#6fae7f"
                  strokeWidth="2"
                  strokeDasharray={edge.relationType === "soft" ? "6 6" : "0"}
                />
              ))}
              {graph.nodes.map((service) => (
                <g key={service._id} transform={`translate(${service.x}, ${service.y})`}>
                  <rect width="180" height="56" rx="14" fill="var(--panel)" stroke="var(--border)" />
                  <text x="14" y="24" fill="var(--text)" fontSize="14" fontWeight="700">
                    {service.name}
                  </text>
                  <text x="14" y="42" fill="var(--muted)" fontSize="11">
                    {service.environment} · {Math.round(service.avgLatencyMs || 0)}ms
                  </text>
                </g>
              ))}
            </svg>
          </div>
        ) : (
          <div className="subtle">No services or dependency edges have been created yet.</div>
        )}
      </Panel>
      <div className="grid cols-3" style={{ marginTop: 16 }}>
        <MetricCard label="Services" value={String(services.length)} trend={`${dependencies.length} dependency edges`} />
        <MetricCard label="Healthy" value={String(services.filter((service) => service.healthStatus === "healthy").length)} trend="Live health state" />
        <MetricCard label="Degraded/Critical" value={String(services.filter((service) => ["degraded", "critical"].includes(service.healthStatus)).length)} trend="Needs attention" />
      </div>
    </>
  );
}

export function AIInsightsPage() {
  const [state, setState] = useState({ loading: true, error: "", data: [] });
  const [context, setContext] = useState({ incidents: [], services: [] });
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [message, setMessage] = useState("");

  const refresh = () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    apiGet("/ai/insights")
      .then((response) => setState({ loading: false, error: "", data: response.data || [] }))
      .catch((error) => setState({ loading: false, error: error.message, data: [] }));
  };

  useEffect(() => {
    refresh();
    Promise.all([apiGet("/incidents"), apiGet("/services")]).then(([incidentsResponse, servicesResponse]) => {
      setContext({
        incidents: incidentsResponse.data || [],
        services: servicesResponse.data || [],
      });
    });
  }, []);

  const runInsight = async (type) => {
    setMessage("");
    try {
      if (type === "incident" && selectedIncidentId) {
        const response = await apiGet(`/ai/incident/${selectedIncidentId}`);
        setMessage(response.data?.summary || "Incident insight generated.");
      } else if (type === "service" && selectedServiceId) {
        const response = await apiGet(`/ai/service/${selectedServiceId}`);
        setMessage(response.data?.summary || response.data?.caution || "Service insight generated.");
      } else {
        setMessage("Pick an item to generate an insight.");
        return;
      }
      refresh();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <>
      <Topbar />
      <PageHeader
        title="AI insights"
        copy="Generated summaries and grounded recommendations from incidents and service telemetry."
        action={<button className="button" onClick={refresh}>Refresh</button>}
      />
      <div className="grid cols-2">
        <Panel title="Generate insight">
          <div className="grid" style={{ gap: 12 }}>
            <label className="field-block">
              <span className="field-label">Incident</span>
              <select className="search" value={selectedIncidentId} onChange={(event) => setSelectedIncidentId(event.target.value)}>
                <option value="">Select incident</option>
                {context.incidents.map((incident) => (
                  <option key={incident._id} value={incident._id}>{incident.title}</option>
                ))}
              </select>
            </label>
            <label className="field-block">
              <span className="field-label">Service</span>
              <select className="search" value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)}>
                <option value="">Select service</option>
                {context.services.map((service) => (
                  <option key={service._id} value={service._id}>{service.name}</option>
                ))}
              </select>
            </label>
            <div className="button-row">
              <button className="button primary" onClick={() => runInsight("incident")} type="button">Generate incident summary</button>
              <button className="button" onClick={() => runInsight("service")} type="button">Generate service trend</button>
            </div>
            {message ? <div className="subtle">{message}</div> : null}
          </div>
        </Panel>
        <Panel title="Recent insights">
          {state.loading ? <div className="subtle">Loading insights...</div> : null}
          {state.error ? <div className="subtle">{state.error}</div> : null}
          {(state.data || []).map((insight) => (
            <div key={insight._id} className="panel" style={{ background: "var(--panel-muted)", marginBottom: 12 }}>
              <div>{insight.title}</div>
              <div className="subtle">{insight.type}</div>
              <div style={{ marginTop: 8 }}>{insight.body}</div>
            </div>
          ))}
          {!state.loading && !state.data.length ? <div className="subtle">No AI insights generated yet.</div> : null}
        </Panel>
        <Panel title="Positioning">
          <div className="subtle">
            The AI layer stays grounded in incident, alert, log, and service records. When evidence is thin, the summary stays cautious instead of inventing a story.
          </div>
        </Panel>
      </div>
    </>
  );
}
