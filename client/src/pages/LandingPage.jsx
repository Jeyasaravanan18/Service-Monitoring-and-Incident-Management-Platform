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
          <h1 style={{ color: "#1e3a8a", letterSpacing: "-1px", lineHeight: 1.1 }}>
            Build confidence.<br />Get the job.
          </h1>

          <p style={{ color: "#3b82f6", fontWeight: 500, fontSize: 18, marginTop: 24, marginBottom: 40, maxWidth: 600, margin: "24px auto 40px" }}>
            Explore careers and prepare for the job with hundreds of free job simulations designed by the world's top employers.
          </p>

          <div className="button-row" style={{ justifyContent: "center" }}>
            <Link className="button primary" style={{ padding: "16px 40px", fontSize: 18, borderRadius: 6 }} to="/auth/register">
              Get Started &rarr;
            </Link>
          </div>
        </section>

        {/* Feature logos placeholder */}
        <section style={{ textAlign: "center", marginTop: 80 }}>
          <h3 style={{ color: "#1e3a8a", fontSize: 20, marginBottom: 40 }}>Featuring job simulations and jobs from leading companies</h3>
          <div style={{ display: "flex", justifyContent: "center", gap: 40, opacity: 0.7, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#1e3a8a" }}>KPMG</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#0d9488" }}>SIEMENS</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#ea580c" }}>BCLP</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#1e3a8a" }}>pwc</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#166534" }}>BCG</span>
          </div>
        </section>

      </main>
    </div>
  );
}
