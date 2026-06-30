import { create } from "zustand";

/**
 * In-memory store for auth state.
 * Access token is NEVER written to localStorage (XSS protection).
 * Only non-sensitive session metadata (user info, workspaceId) is persisted.
 */
export const useAppStore = create((set, get) => ({
  user: null,
  token: null,        // access token — memory only, never persisted
  refreshToken: null, // refresh token — stored in httpOnly cookie on server, kept here as fallback
  workspaceId: null,
  sidebarOpen: false,

  setSession: (session) =>
    set({
      user: session?.user || null,
      token: session?.accessToken || null,
      refreshToken: session?.refreshToken || null,
      workspaceId:
        session?.workspaceId ||
        session?.user?.workspaceIds?.[0] ||
        null,
    }),

  setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),

  setToken: (accessToken) => set({ token: accessToken }),

  setWorkspaceId: (workspaceId) => set({ workspaceId }),

  logout: () => {
    // Remove only non-sensitive persisted data
    localStorage.removeItem("smimp-user");
    set({ user: null, token: null, refreshToken: null, workspaceId: null });
  },
}));

/**
 * Hydrate session from localStorage on app boot.
 * Only restores user metadata + workspaceId — access token stays empty.
 * The token will be refreshed automatically on first API call.
 */
export function hydrateSession() {
  try {
    const raw = localStorage.getItem("smimp-user");
    if (!raw) return null;
    const saved = JSON.parse(raw);
    // Restore user & workspaceId but NOT the access token
    useAppStore.getState().setSession({
      user: saved?.user || null,
      accessToken: null,          // will be refreshed on first 401
      refreshToken: saved?.refreshToken || null,
      workspaceId: saved?.workspaceId || null,
    });
    return saved;
  } catch {
    return null;
  }
}

/**
 * Persist non-sensitive session metadata to localStorage.
 * The access token is intentionally excluded.
 */
export function persistSession(session) {
  try {
    localStorage.setItem(
      "smimp-user",
      JSON.stringify({
        user: session?.user || null,
        refreshToken: session?.refreshToken || null,
        workspaceId:
          session?.workspaceId ||
          session?.user?.workspaceIds?.[0] ||
          null,
      })
    );
    // Also update the in-memory store with the full session (including access token)
    useAppStore.getState().setSession(session);
  } catch {
    // localStorage unavailable — continue with memory-only session
  }
}
