import React from "react";
import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", paddingBottom: 64 }}>
      {/* Topbar */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 40px",
        background: "transparent",
        position: "absolute",
        width: "100%",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="brand-mark" style={{ borderRadius: 6 }} />
          <span style={{ fontWeight: 800, fontSize: 20, color: "var(--color-brand)", letterSpacing: "-0.5px" }}>
            SMIMP
          </span>
        </div>
        <nav style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link className="button" style={{ border: "none", background: "transparent" }} to="/auth/login">Sign In</Link>
          <Link className="button primary" style={{ borderRadius: 6, padding: "8px 24px" }} to="/auth/register">Sign Up</Link>
        </nav>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "120px 24px 40px" }}>
        
        {/* Hero Section */}
        <section className="hero" style={{ marginTop: 40, marginBottom: 60 }}>
          <h1 style={{ color: "var(--color-text)", letterSpacing: "-1.5px", lineHeight: 1.1, fontSize: 52 }}>
            Build resilience.<br />Protect your uptime.
          </h1>

          <p style={{ color: "var(--color-text-soft)", fontWeight: 500, fontSize: 18, marginTop: 24, marginBottom: 40, maxWidth: 640, margin: "24px auto 40px", lineHeight: 1.6 }}>
            SMIMP is the next-generation service monitoring and incident response platform. Get real-time telemetry, automated alert correlation, dependency topology graphing, and AI-grounded operational insights.
          </p>

          <div className="button-row" style={{ justifyContent: "center" }}>
            <Link className="button primary" style={{ padding: "16px 40px", fontSize: 18, borderRadius: 8 }} to="/auth/register">
              Start Monitoring Free &rarr;
            </Link>
          </div>
        </section>

        {/* Feature logos / Integrations section */}
        <section style={{ textAlign: "center", marginTop: 80 }}>
          <h3 style={{ color: "var(--color-text-soft)", fontSize: 18, marginBottom: 40, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Grounded Telemetry & Integrations</h3>
          <div style={{ display: "flex", justifyContent: "center", gap: 50, opacity: 0.6, flexWrap: "wrap", alignItems: "center", fontSize: 20, fontWeight: 800, color: "var(--color-text)" }}>
            <span>KUBERNETES</span>
            <span>PROMETHEUS</span>
            <span>SLACK</span>
            <span>DATADOG</span>
            <span>AWS</span>
          </div>
        </section>

      </main>
    </div>
  );
}
