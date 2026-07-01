import React, { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiPost } from "../lib/api.js";
import { useAppStore, persistSession } from "../store/useAppStore.js";

export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addToast = useAppStore((state) => state.addToast);
  const setSession = useAppStore((state) => state.setSession);
  const effectRan = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (effectRan.current) return;
    effectRan.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state") || "login";
    const redirectUri = window.location.origin + "/auth/google/callback";

    if (!code) {
      addToast("Google authorization code is missing.", "error");
      navigate(state === "link" ? "/app/profile" : "/auth/login");
      return;
    }

    const processOAuth = async () => {
      try {
        if (state === "link") {
          // Link account flow
          await apiPost("/auth/google/link", { code, redirectUri });
          
          // Re-fetch or update user session profile in local storage to sync Google state
          const activeSession = JSON.parse(localStorage.getItem("smimp-user") || "null");
          if (activeSession && activeSession.user) {
            activeSession.user.googleId = "linked"; // temporary marker until next sync/refresh
            persistSession(activeSession);
            setSession(activeSession);
          }
          
          addToast("Google Account successfully linked to your profile!", "success");
          navigate("/app/profile");
        } else {
          // Login / registration flow
          const response = await apiPost("/auth/google", { code, redirectUri });
          const sessionData = response.data;
          
          persistSession(sessionData);
          setSession(sessionData);
          
          addToast(`Welcome back, ${sessionData.user.name}!`, "success");
          navigate("/app");
        }
      } catch (err) {
        console.error("Google OAuth Callback Error:", err);
        addToast(err.message || "Failed to complete Google authentication.", "error");
        navigate(state === "link" ? "/app/profile" : "/auth/login");
      }
    };

    processOAuth();
  }, [searchParams, navigate, addToast, setSession]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--color-surface-alt)" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 40, height: 40, border: "4px solid var(--color-border-strong)", borderTopColor: "var(--color-brand)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: 16 }}>Authenticating with Google...</div>
        <div className="subtle" style={{ fontSize: 13 }}>Please do not close this window.</div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
