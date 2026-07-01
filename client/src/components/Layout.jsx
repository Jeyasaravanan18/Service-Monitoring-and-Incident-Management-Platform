import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { navGroups } from "../data/navigation.js";
import { apiGet, apiPost } from "../lib/api.js";
import { persistSession, useAppStore } from "../store/useAppStore.js";
import { disconnectSocket } from "../lib/socket.js";
import { Menu, Search, Bell, Plus, User, ChevronDown } from "lucide-react";
import { CommandPalette } from "./CommandPalette.jsx";

export function ToastContainer() {
  const toasts = useAppStore((state) => state.toasts);
  const removeToast = useAppStore((state) => state.removeToast);

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`} onClick={() => removeToast(toast.id)}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}

export function AppShell({ children }) {
  const user = useAppStore((state) => state.user);
  const workspaceId = useAppStore((state) => state.workspaceId);
  const setWorkspaceId = useAppStore((state) => state.setWorkspaceId);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);

  const [workspaces, setWorkspaces] = useState([]);

  const activeRole = useMemo(() => {
    return (
      user?.workspaceRoles?.find(
        (item) => String(item.workspaceId) === String(workspaceId)
      )?.role ||
      user?.roles?.[0] ||
      "viewer"
    );
  }, [user, workspaceId]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    apiGet("/workspaces")
      .then((response) => {
        if (mounted) setWorkspaces(response.data || []);
      })
      .catch(() => {
        if (mounted) setWorkspaces([]);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  const workspaceOptions = useMemo(() => {
    if (workspaces.length) return workspaces;
    return (user?.workspaceIds || []).map((id) => ({
      _id: id,
      name: `Workspace ${String(id).slice(-4)}`,
    }));
  }, [user, workspaces]);

  const visibleGroups = useMemo(
    () =>
      navGroups.map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            !item.roles ||
            item.roles.includes(activeRole) ||
            activeRole === "super-admin"
        ),
      })),
    [activeRole]
  );

  return (
    <div className="app-shell">
      <div 
        className={`sidebar-backdrop ${sidebarOpen ? "open" : ""}`} 
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <Link to="/" className="brand" onClick={() => setSidebarOpen(false)} style={{ borderBottom: "none", paddingBottom: 12 }}>
          <div className="brand-mark" />
          <span style={{ color: "var(--color-brand)", fontSize: 20, fontWeight: 800 }}>SMIMP</span>
        </Link>
        
        {/* Workspace selector in Sidebar */}
        <div style={{ padding: "0 24px 16px 24px", borderBottom: "1px solid var(--color-border)" }}>
          <select
            className="search"
            style={{ width: "100%", margin: 0, padding: "8px 12px", height: "38px", borderRadius: "8px", fontSize: 13 }}
            value={workspaceId || ""}
            onChange={(event) => {
              const nextWorkspaceId = event.target.value || null;
              setWorkspaceId(nextWorkspaceId);
              const session = JSON.parse(
                localStorage.getItem("smimp-user") || "null"
              );
              if (session) {
                persistSession({ ...session, workspaceId: nextWorkspaceId });
              }
            }}
          >
            {workspaceOptions.map((workspace) => (
              <option key={workspace._id} value={workspace._id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </div>

        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {visibleGroups.map((group) => (
            <div className="nav-section" key={group.label} style={{ paddingTop: 16 }}>
              <div className="nav-label">{group.label}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? "active" : ""}`
                    }
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {Icon && <Icon size={16} strokeWidth={1.5} />}
                      {item.label}
                    </span>
                    <span>{">"}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Systems Operational Footer */}
        <div className="sidebar-footer" style={{ padding: "16px 24px", borderTop: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 10, background: "var(--color-surface)" }}>
          <div style={{ width: 8, height: 8, background: "var(--color-success)", borderRadius: "50%", animation: "pulse-dot 2s infinite" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Systems Operational</span>
        </div>
      </aside>
      <main className="main">{children}</main>
      <CommandPalette />
      <ToastContainer />
    </div>
  );
}

export function Topbar() {
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const workspaceId = useAppStore((state) => state.workspaceId);
  const logout = useAppStore((state) => state.logout);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);

  const [profileOpen, setProfileOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState([]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    // Fetch active alerts for notification badge
    apiGet("/alerts")
      .then((response) => {
        if (mounted) {
          const active = (response.data || []).filter(a => a.status === "open");
          setRecentAlerts(active);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleSignout = async () => {
    const session = JSON.parse(localStorage.getItem("smimp-user") || "null");
    try {
      await apiPost("/auth/logout", {
        refreshToken: session?.refreshToken || null,
      });
    } catch {
      // Local logout fallback
    }
    disconnectSocket();
    logout();
    navigate("/auth/login");
  };

  return (
    <div className="topbar">
      <button 
        className="button hamburger-btn" 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{ display: "none", padding: "6px 12px", border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-brand)" }}
        aria-label="Toggle Sidebar"
      >
        <Menu size={18} strokeWidth={1.5} />
      </button>

      {/* 1. Global Command Palette Search */}
      <div 
        className="search" 
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", color: "var(--color-text-soft)" }}
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={16} />
          Search commands...
        </span>
        <kbd style={{ background: "var(--color-surface-alt)", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>Ctrl+K</kbd>
      </div>

      <div style={{ flex: 1 }} />

      {/* 3. Quick Action Menu Dropdown */}
      <div style={{ position: "relative" }}>
        <button 
          className="button primary" 
          style={{ height: "40px", width: "40px", padding: 0, borderRadius: "8px" }}
          onClick={() => {
            setQuickCreateOpen(!quickCreateOpen);
            setProfileOpen(false);
            setNotificationsOpen(false);
          }}
          title="Quick Actions"
        >
          <Plus size={18} />
        </button>
        {quickCreateOpen && (
          <div style={{
            position: "absolute",
            top: "48px",
            right: 0,
            width: "180px",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-strong)",
            borderRadius: "8px",
            boxShadow: "var(--shadow-md)",
            zIndex: 100,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
            <button 
              style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, borderBottom: "1px solid var(--color-border)" }}
              onClick={() => { setQuickCreateOpen(false); navigate("/app/services"); }}
            >
              + Create Service
            </button>
            <button 
              style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, borderBottom: "1px solid var(--color-border)" }}
              onClick={() => { setQuickCreateOpen(false); navigate("/app/alert-rules"); }}
            >
              + Create Alert Rule
            </button>
            <button 
              style={{ padding: "12px 16px", textAlign: "left", fontSize: 14 }}
              onClick={() => { setQuickCreateOpen(false); navigate("/app/maintenance"); }}
            >
              + Create Maint Window
            </button>
          </div>
        )}
      </div>

      {/* 4. Notification Alert Bell */}
      <div style={{ position: "relative" }}>
        <button 
          className="button" 
          style={{ height: "40px", width: "40px", padding: 0, borderRadius: "8px", position: "relative" }}
          onClick={() => {
            setNotificationsOpen(!notificationsOpen);
            setProfileOpen(false);
            setQuickCreateOpen(false);
          }}
        >
          <Bell size={18} />
          {recentAlerts.length > 0 && (
            <div style={{
              position: "absolute",
              top: "6px",
              right: "6px",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--color-danger)"
            }} />
          )}
        </button>
        {notificationsOpen && (
          <div style={{
            position: "absolute",
            top: "48px",
            right: 0,
            width: "280px",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-strong)",
            borderRadius: "8px",
            boxShadow: "var(--shadow-md)",
            zIndex: 100,
            overflow: "hidden"
          }}>
            <div style={{ padding: "12px 16px", fontWeight: "bold", borderBottom: "1px solid var(--color-border)", fontSize: 14 }}>
              Active Workspace Alerts ({recentAlerts.length})
            </div>
            <div style={{ maxHeight: "200px", overflowY: "auto" }}>
              {recentAlerts.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--color-text-soft)", fontSize: 13 }}>
                  No active alerts. All clear!
                </div>
              ) : (
                recentAlerts.map(alert => (
                  <div key={alert._id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>{alert.title}</div>
                    <div style={{ color: "var(--color-text-soft)", fontSize: 11 }}>{alert.severity} • {alert.status}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. User Profile Menu */}
      <div style={{ position: "relative" }}>
        <button 
          className="button"
          style={{ height: "40px", display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: "8px" }}
          onClick={() => {
            setProfileOpen(!profileOpen);
            setQuickCreateOpen(false);
            setNotificationsOpen(false);
          }}
        >
          <User size={16} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{user?.name || "Guest"}</span>
          <ChevronDown size={14} />
        </button>
        {profileOpen && (
          <div style={{
            position: "absolute",
            top: "48px",
            right: 0,
            width: "200px",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-strong)",
            borderRadius: "8px",
            boxShadow: "var(--shadow-md)",
            zIndex: 100,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", fontSize: 13 }}>
              <div style={{ color: "var(--color-text-soft)", fontSize: 11 }}>Signed in as</div>
              <div style={{ fontWeight: 600 }}>{user?.email || "guest@smimp.io"}</div>
            </div>
            <button 
              style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, borderBottom: "1px solid var(--color-border)" }}
              onClick={() => { setProfileOpen(false); navigate("/app/profile"); }}
            >
              Profile Settings
            </button>
            <button 
              style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, color: "var(--color-danger)" }}
              onClick={() => { setProfileOpen(false); handleSignout(); }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PageHeader({ title, copy, action }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        alignItems: "flex-start",
        flexWrap: "wrap",
        marginBottom: 24,
      }}
    >
      <div>
        <h1 className="page-title">{title}</h1>
        {copy ? <p className="page-copy">{copy}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, children, className = "" }) {
  return (
    <section className={`panel panel-strong ${className}`}>
      {title ? <h3>{title}</h3> : null}
      {children}
    </section>
  );
}
