import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/Layout.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { LoginPage, ForgotPasswordPage, RegisterPage, ResetPasswordPage, VerifyEmailPage } from "./pages/AuthPages.jsx";
import { GoogleCallbackPage } from "./pages/GoogleCallbackPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import {
  AlertsPage,
  AlertDetailPage,
  AIInsightsPage,
  AnalyticsPage,
  AuditLogsPage,
  DependencyGraphPage,
  DeploymentsPage,
  IncidentsPage,
  IncidentDetailPage,
  IntegrationPage,
  MetricsPage,
  LogsPage,
  MaintenanceWindowsPage,
  NotificationsPage,
  ProfilePage,
  SavedViewsPage,
  ServiceDetailPage,
  ServicesPage,
  SLOPage,
  EscalationPoliciesPage,
  PublicStatusPage,
  StatusPagesPage,
  TeamsPage,
  WorkspacesPage,
  AlertRulesPage,
} from "./pages/ProductPages.jsx";
import { useAppStore } from "./store/useAppStore.js";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

function RequireSession({ children }) {
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const location = useLocation();
  if (!token && !user) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }
  return children;
}

function PublicOnly({ children }) {
  const token = useAppStore((state) => state.token);
  if (token) {
    return <Navigate to="/app" replace />;
  }
  return children;
}

function RequireRole({ roles, children }) {
  const user = useAppStore((state) => state.user);
  const workspaceId = useAppStore((state) => state.workspaceId);
  const currentRole = user?.workspaceRoles?.find((item) => String(item.workspaceId) === String(workspaceId))?.role || user?.roles?.[0] || "viewer";
  const allowed = roles.includes(currentRole) || currentRole === "super-admin" || (user?.roles || []).includes("super-admin");
  if (!allowed) {
    return <Navigate to="/app" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/auth/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route path="/auth/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
      <Route path="/auth/reset-password" element={<PublicOnly><ResetPasswordPage /></PublicOnly>} />
      <Route path="/auth/verify-email" element={<PublicOnly><VerifyEmailPage /></PublicOnly>} />
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
      <Route path="/status/:subdomain" element={<PublicStatusPage />} />

      <Route path="/app" element={<RequireSession><AppShell><DashboardPage /></AppShell></RequireSession>} />
      <Route path="/app/analytics" element={<RequireSession><AppShell><AnalyticsPage /></AppShell></RequireSession>} />
      <Route path="/app/ai" element={<RequireSession><AppShell><AIInsightsPage /></AppShell></RequireSession>} />
      <Route path="/app/graph" element={<RequireSession><AppShell><DependencyGraphPage /></AppShell></RequireSession>} />

      <Route path="/app/services" element={<RequireSession><AppShell><ServicesPage /></AppShell></RequireSession>} />
      <Route path="/app/services/:id" element={<RequireSession><AppShell><ServiceDetailPage /></AppShell></RequireSession>} />
      <Route path="/app/alert-rules" element={<RequireSession><RequireRole roles={["super-admin", "admin"]}><AppShell><AlertRulesPage /></AppShell></RequireRole></RequireSession>} />
      <Route path="/app/alerts" element={<RequireSession><AppShell><AlertsPage /></AppShell></RequireSession>} />
      <Route path="/app/alerts/:id" element={<RequireSession><AppShell><AlertDetailPage /></AppShell></RequireSession>} />
      <Route path="/app/incidents" element={<RequireSession><AppShell><IncidentsPage /></AppShell></RequireSession>} />
      <Route path="/app/incidents/:id" element={<RequireSession><AppShell><IncidentDetailPage /></AppShell></RequireSession>} />
      <Route path="/app/logs" element={<RequireSession><AppShell><LogsPage /></AppShell></RequireSession>} />
      <Route path="/app/deployments" element={<RequireSession><AppShell><DeploymentsPage /></AppShell></RequireSession>} />
      <Route path="/app/metrics" element={<RequireSession><AppShell><MetricsPage /></AppShell></RequireSession>} />
      <Route path="/app/maintenance" element={<RequireSession><RequireRole roles={["super-admin", "admin"]}><AppShell><MaintenanceWindowsPage /></AppShell></RequireRole></RequireSession>} />
      <Route path="/app/escalation-policies" element={<RequireSession><RequireRole roles={["super-admin", "admin"]}><AppShell><EscalationPoliciesPage /></AppShell></RequireRole></RequireSession>} />

      <Route path="/app/org" element={<RequireSession><RequireRole roles={["super-admin", "admin"]}><AppShell><WorkspacesPage /></AppShell></RequireRole></RequireSession>} />
      <Route path="/app/teams" element={<RequireSession><RequireRole roles={["super-admin", "admin"]}><AppShell><TeamsPage /></AppShell></RequireRole></RequireSession>} />
      <Route path="/app/audit" element={<RequireSession><RequireRole roles={["super-admin", "admin"]}><AppShell><AuditLogsPage /></AppShell></RequireRole></RequireSession>} />
      <Route path="/app/notifications" element={<RequireSession><RequireRole roles={["super-admin", "admin"]}><AppShell><NotificationsPage /></AppShell></RequireRole></RequireSession>} />
      <Route path="/app/profile" element={<RequireSession><AppShell><ProfilePage /></AppShell></RequireSession>} />
      <Route path="/app/integrations" element={<RequireSession><RequireRole roles={["super-admin", "admin"]}><AppShell><IntegrationPage /></AppShell></RequireRole></RequireSession>} />
      <Route path="/app/status" element={<RequireSession><RequireRole roles={["super-admin", "admin"]}><AppShell><StatusPagesPage /></AppShell></RequireRole></RequireSession>} />
      <Route path="/app/slo" element={<RequireSession><RequireRole roles={["super-admin", "admin"]}><AppShell><SLOPage /></AppShell></RequireRole></RequireSession>} />
      <Route path="/app/views" element={<RequireSession><AppShell><SavedViewsPage /></AppShell></RequireSession>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
}
