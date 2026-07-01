import React, { useEffect, useState, useRef } from "react";
import { apiGet } from "../lib/api.js";
import { Topbar, PageHeader } from "./Layout.jsx";

export function TerminalLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiGet("/logs")
      .then((res) => {
        if (!mounted) return;
        // Assume logs are returned in descending order (newest first)
        // For a terminal (bottom-to-top), we want to reverse them so oldest are at the top and newest at the bottom
        const data = res.data || [];
        setLogs([...data].reverse());
        setError("");
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom on load
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const getLogColor = (severity) => {
    switch ((severity || "").toLowerCase()) {
      case "critical":
        return "#bf616a"; // Red
      case "error":
        return "#d08770"; // Orange
      case "warn":
        return "#ebcb8b"; // Yellow
      case "info":
        return "#a3be8c"; // Green
      case "debug":
        return "#81a1c1"; // Blue
      default:
        return "var(--color-text)";
    }
  };

  return (
    <>
      <Topbar />
      <PageHeader
        title="System Logs"
        copy="Raw streaming telemetry and system output."
      />
      
      {error && <div className="alert-banner alert-banner--error">{error}</div>}
      
      <div 
        style={{
          background: "var(--color-surface-alt)",
          border: "1px solid var(--color-border-strong)",
          borderRadius: "var(--radius-lg)",
          padding: "16px",
          height: "calc(100vh - 220px)",
          overflowY: "auto",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
        }}
      >
        <div style={{ color: "var(--color-text-soft)", marginBottom: 16 }}>
          {">"} Initialize SMIMP Telemetry Stream...
          <br />
          {loading ? "> Connecting to mainframe..." : "> Connection established."}
        </div>
        
        {logs.map((log, i) => (
          <div key={log._id || i} style={{ marginBottom: 4, display: "flex", gap: 12, lineHeight: 1.5 }}>
            <span style={{ color: "var(--color-text-soft)", minWidth: 160 }}>
              {new Date(log.occurredAt).toLocaleString()}
            </span>
            <span style={{ color: getLogColor(log.severity), minWidth: 80 }}>
              [{log.severity ? log.severity.toUpperCase() : "INFO"}]
            </span>
            <span style={{ color: "var(--color-text-soft)", minWidth: 80 }}>
              {log.environment || "env"}
            </span>
            <span style={{ color: "var(--color-text)", flex: 1 }}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </>
  );
}
