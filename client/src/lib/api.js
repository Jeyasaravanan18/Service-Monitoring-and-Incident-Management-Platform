import { useAppStore, persistSession } from "../store/useAppStore.js";

const viteEnv = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};

export const API_BASE = viteEnv.VITE_API_BASE || "http://127.0.0.1:4000/api";

// Track if a token refresh is already in progress to avoid parallel refresh calls
let refreshPromise = null;

function getToken() {
  return useAppStore.getState().token || null;
}

function getWorkspaceId() {
  return useAppStore.getState().workspaceId || null;
}

function getRefreshToken() {
  // Try in-memory first, then localStorage fallback
  const memRefresh = useAppStore.getState().refreshToken;
  if (memRefresh) return memRefresh;
  try {
    const saved = JSON.parse(localStorage.getItem("smimp-user") || "null");
    return saved?.refreshToken || null;
  } catch {
    return null;
  }
}

async function doRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error("Refresh failed");
  }

  const body = await response.json().catch(() => null);
  const sessionData = body?.data;
  if (!sessionData?.accessToken) throw new Error("Refresh returned no token");

  // Persist the new session (access token goes to memory, metadata to localStorage)
  persistSession(sessionData);
  return sessionData.accessToken;
}

async function refreshAccessToken() {
  // Deduplicate parallel refresh calls
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function request(path, options = {}, isRetry = false) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const workspaceId = getWorkspaceId();
  if (workspaceId) {
    headers["X-Workspace-Id"] = workspaceId;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && !isRetry && path !== "/auth/refresh" && path !== "/auth/login") {
      try {
        await refreshAccessToken();
        return request(path, options, true); // retry with new token
      } catch {
        // Refresh failed — clear session and redirect to login
        useAppStore.getState().logout();
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
        throw new Error("Session expired. Please log in again.");
      }
    }
    throw new Error(body?.message || `Request failed: ${response.status}`);
  }

  return body;
}

export const apiGet = (path) => request(path);
export const apiPost = (path, data) => request(path, { method: "POST", body: JSON.stringify(data) });
export const apiPatch = (path, data) => request(path, { method: "PATCH", body: JSON.stringify(data) });
export const apiDelete = (path) => request(path, { method: "DELETE" });
