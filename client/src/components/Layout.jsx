import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { navGroups } from "../data/navigation.js";
import { apiGet, apiPost } from "../lib/api.js";
import { persistSession, useAppStore } from "../store/useAppStore.js";
import { disconnectSocket } from "../lib/socket.js";
import { Menu, LogOut, Search } from "lucide-react";
import { CommandPalette } from "./CommandPalette.jsx";

export function AppShell({ children }) {
  const user = useAppStore((state) => state.user);
  const workspaceId = useAppStore((state) => state.workspaceId);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);

  const activeRole = useMemo(() => {
    return (
      user?.workspaceRoles?.find(
        (item) => String(item.workspaceId) === String(workspaceId)
      )?.role ||
      user?.roles?.[0] ||
      "viewer"
    );
  }, [user, workspaceId]);

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
        <Link to="/" className="brand" onClick={() => setSidebarOpen(false)}>
          <div className="brand-mark" />
          <span style={{ color: "var(--color-brand)", fontSize: 18, textShadow: "var(--shadow-glow)" }}>SMIMP_</span>
        </Link>
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {visibleGroups.map((group) => (
            <div className="nav-section" key={group.label}>
              <div className="nav-label">[ {group.label} ]</div>
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
      </aside>
      <main className="main">{children}</main>
      <CommandPalette />
    </div>
  );
}

export function Topbar() {
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const workspaceId = useAppStore((state) => state.workspaceId);
  const setWorkspaceId = useAppStore((state) => state.setWorkspaceId);
  const logout = useAppStore((state) => state.logout);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);

  const activeRole = useMemo(() => {
    return (
      user?.workspaceRoles?.find(
        (item) => String(item.workspaceId) === String(workspaceId)
      )?.role ||
      user?.roles?.[0] ||
      "viewer"
    );
  }, [user, workspaceId]);
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    apiGet("/workspaces")
      .then((response) => {
        if (!mounted) return;
        setWorkspaces(response.data || []);
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

  const activeWorkspace = workspaceOptions.find(
    (w) => w._id === workspaceId
  );

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

      <select
        className="search"
        style={{ maxWidth: 220, flex: "none" }}
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

      <span className="workspace-pill" style={{ flex: "none" }}>
        {activeWorkspace?.name || "Workspace"}
      </span>

      <span
        className="badge"
        style={{
          padding: "7px 12px",
          boxShadow: "var(--shadow-xs)",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          flex: "none",
          textTransform: "capitalize",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--color-text-soft)",
        }}
      >
        {activeRole}
      </span>

      <span className="user-pill" style={{ flex: "none" }}>
        {user?.name || "Guest"}
      </span>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        background: "rgba(6, 182, 212, 0.1)",
        border: "1px solid var(--color-brand)",
        color: "var(--color-brand)",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        boxShadow: "var(--shadow-glow)",
      }}>
        <div style={{ width: 6, height: 6, background: "var(--color-brand)", borderRadius: "50%", animation: "pulse-dot 2s infinite" }} />
        AI CORE
      </div>

      <button
        className="button"
        type="button"
        onClick={async () => {
          const session = JSON.parse(
            localStorage.getItem("smimp-user") || "null"
          );
          try {
            await apiPost("/auth/logout", {
              refreshToken: session?.refreshToken || null,
            });
          } catch {
            // local logout should still succeed if the API is unavailable
          }
          disconnectSocket();
          logout();
          navigate("/auth/login");
        }}
      >
        Sign out
      </button>
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
