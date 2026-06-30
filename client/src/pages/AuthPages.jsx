import React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppStore, persistSession } from "../store/useAppStore.js";
import { apiPost } from "../lib/api.js";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  workspaceName: z.string().min(2, "Workspace name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(["super-admin", "admin", "viewer"])
});

function FormField({ name, placeholder, type = "text", error, register, autoComplete }) {
  return (
    <div className="field-block">
      <label className="field-label" htmlFor={name}>{placeholder}</label>
      <input
        id={name}
        type={type}
        placeholder={placeholder}
        {...(register ? register(name) : {})}
        autoComplete={autoComplete || "off"}
        style={{ borderColor: error ? "var(--color-danger)" : undefined }}
      />
      {error && <div style={{ color: "var(--color-danger)", fontSize: 12, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>{error}</div>}
    </div>
  );
}

function AuthShell({ children, eyebrow, title, copy }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand" style={{ marginBottom: 28, padding: 0, border: "none", justifyContent: "center" }}>
          <div className="brand-mark" style={{ width: 24, height: 24 }} />
          <span style={{ color: "var(--color-brand)", fontSize: 20, letterSpacing: "0.15em", textShadow: "var(--shadow-glow)" }}>SMIMP_</span>
        </div>
        {eyebrow && (
          <div style={{
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "var(--color-brand)",
            marginBottom: 12,
            textAlign: "center"
          }}>
            [ {eyebrow} ]
          </div>
        )}
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12, textAlign: "center", textShadow: "0 0 10px rgba(255,255,255,0.2)" }}>{title}</h1>
        <p style={{ color: "var(--color-text-soft)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginBottom: 32, lineHeight: 1.6, textAlign: "center" }}>{copy}</p>
        {children}
      </div>
    </div>
  );
}

function useAuthSubmit(onSuccess) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (endpoint, form) => {
    setError("");
    setLoading(true);
    try {
      const response = await apiPost(endpoint, form);
      onSuccess(response.data);
      persistSession(response.data);
      navigate("/app");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { error, loading, submit };
}

export function LoginPage() {
  const setSession = useAppStore((state) => state.setSession);
  const { error: apiError, loading, submit } = useAuthSubmit(setSession);
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  return (
    <AuthShell
      eyebrow="Operational access"
      title="Welcome back"
      copy="Monitor services, respond to alerts, and keep incident evidence aligned in one workspace."
    >
      <form
        className="grid"
        style={{ gap: 14 }}
        onSubmit={handleSubmit((data) => submit("/auth/login", data))}
        autoComplete="off"
      >
        <FormField
          name="email"
          placeholder="Email address"
          type="email"
          register={register}
          error={errors.email?.message}
          autoComplete="email"
        />
        <FormField
          name="password"
          placeholder="Password"
          type="password"
          register={register}
          error={errors.password?.message}
          autoComplete="current-password"
        />
        {apiError && (
          <div className="alert-banner alert-banner--error">{apiError}</div>
        )}
        <button className="button primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "11px" }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <div className="subtle" style={{ textAlign: "center", fontSize: 13 }}>
          Don't have an account? <Link to="/auth/register">Create one</Link>
        </div>
        <div style={{ textAlign: "center" }}>
          <Link to="/auth/forgot-password" style={{ fontSize: 13, color: "var(--color-muted)" }}>
            Forgot your password?
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const setSession = useAppStore((state) => state.setSession);
  const { error: apiError, loading, submit } = useAuthSubmit(setSession);
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", workspaceName: "", email: "", password: "", role: "admin" }
  });

  return (
    <AuthShell
      eyebrow="New workspace"
      title="Create your workspace"
      copy="Set up a monitoring workspace, onboard your first admin, and start capturing service health data."
    >
      <form
        className="grid"
        style={{ gap: 14 }}
        onSubmit={handleSubmit((data) => submit("/auth/register", data))}
        autoComplete="off"
      >
        <FormField
          name="name"
          placeholder="Your full name"
          register={register}
          error={errors.name?.message}
        />
        <FormField
          name="workspaceName"
          placeholder="Workspace name"
          register={register}
          error={errors.workspaceName?.message}
        />
        <FormField
          name="email"
          placeholder="Email address"
          type="email"
          register={register}
          error={errors.email?.message}
          autoComplete="email"
        />
        <FormField
          name="password"
          placeholder="Password"
          type="password"
          register={register}
          error={errors.password?.message}
          autoComplete="new-password"
        />
        
        <div className="field-block">
          <label className="field-label" htmlFor="role">Initial Role</label>
          <select
            id="role"
            className="search"
            {...register("role")}
            style={{ width: "100%", padding: "10px", background: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", borderColor: errors.role ? "var(--color-danger)" : undefined }}
          >
            <option value="super-admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
          {errors.role && <div style={{ color: "var(--color-danger)", fontSize: 12, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>{errors.role.message}</div>}
        </div>

        {apiError && (
          <div className="alert-banner alert-banner--error">{apiError}</div>
        )}
        <button className="button primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "11px" }}>
          {loading ? "Creating workspace..." : "Create workspace"}
        </button>
        <div className="subtle" style={{ textAlign: "center", fontSize: 13 }}>
          Already have an account? <Link to="/auth/login">Sign in</Link>
        </div>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [form, setForm] = useState({ email: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      copy="Enter your email address and we'll send you a password reset link."
    >
      <form
        className="grid"
        style={{ gap: 14 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            const response = await apiPost("/auth/forgot-password", form);
            setMessage(response.data?.message || "If your email is registered, a reset link has been sent.");
          } catch {
            setMessage("If your email is registered, a reset link has been sent.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <FormField
          name="email"
          placeholder="Email address"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ email: e.target.value })}
          autoComplete="email"
        />
        {message && <div className="alert-banner alert-banner--success">{message}</div>}
        <button className="button primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "11px" }}>
          {loading ? "Sending..." : "Send reset link"}
        </button>
        <div className="subtle" style={{ textAlign: "center", fontSize: 13 }}>
          <Link to="/auth/login">Back to sign in</Link>
        </div>
      </form>
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ token: searchParams.get("token") || "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token") || "";
    if (token) {
      setForm({ token });
      // Auto-submit if token came from URL
    }
  }, [searchParams]);

  return (
    <AuthShell
      eyebrow="Account setup"
      title="Verify your email"
      copy="Check your inbox for a verification link, or paste the token below."
    >
      <form
        className="grid"
        style={{ gap: 14 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            await apiPost("/auth/verify-email", form);
            setMessage("Email verified successfully! You can now sign in.");
          } catch (err) {
            setMessage(err.message || "Verification failed. The token may have expired.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <FormField
          name="token"
          placeholder="Verification token"
          value={form.token}
          onChange={(e) => setForm({ token: e.target.value })}
        />
        {message && (
          <div className={`alert-banner ${message.includes("success") ? "alert-banner--success" : "alert-banner--error"}`}>
            {message}
          </div>
        )}
        <button className="button primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "11px" }}>
          {loading ? "Verifying..." : "Verify email"}
        </button>
        <div className="subtle" style={{ textAlign: "center", fontSize: 13 }}>
          <Link to="/auth/login">Back to sign in</Link>
        </div>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    token: searchParams.get("token") || "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const token = searchParams.get("token") || "";
    if (token) setForm((f) => ({ ...f, token }));
  }, [searchParams]);

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Choose a new password"
      copy="Create a strong password for your account."
    >
      <form
        className="grid"
        style={{ gap: 14 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (form.password !== form.confirmPassword) {
            setMessage("Passwords do not match.");
            return;
          }
          setLoading(true);
          try {
            await apiPost("/auth/reset-password", { token: form.token, password: form.password });
            setMessage("Password updated successfully. You can now sign in.");
          } catch (err) {
            setMessage(err.message || "Reset failed. The link may have expired.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <FormField
          name="token"
          placeholder="Reset token"
          value={form.token}
          onChange={(e) => setForm({ ...form, token: e.target.value })}
        />
        <FormField
          name="new-password"
          placeholder="New password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          autoComplete="new-password"
        />
        <FormField
          name="confirm-password"
          placeholder="Confirm new password"
          type="password"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          autoComplete="new-password"
        />
        {message && (
          <div className={`alert-banner ${message.includes("success") ? "alert-banner--success" : "alert-banner--error"}`}>
            {message}
          </div>
        )}
        <button className="button primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "11px" }}>
          {loading ? "Updating..." : "Update password"}
        </button>
        <div className="subtle" style={{ textAlign: "center", fontSize: 13 }}>
          <Link to="/auth/login">Back to sign in</Link>
        </div>
      </form>
    </AuthShell>
  );
}
