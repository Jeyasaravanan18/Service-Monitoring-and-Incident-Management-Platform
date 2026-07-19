# Service Monitoring and Incident Management Platform ⚡

**A full-stack, event-driven Service Monitoring & AI Incident Management Platform.**

A centralized, real-time command center for infrastructure observability — providing real-time telemetry streaming, concurrent health polling, and AI-synthesized postmortems to drastically reduce Mean Time to Resolution (MTTR) during critical outages.

---

## 📖 The Problem Statement

In the era of microservices, software architectures are highly distributed. When a critical service fails, engineering teams face three immediate challenges:
1. **Fragmented Visibility:** Telemetry, error logs, and alerts are scattered across multiple disparate tools.
2. **Alert Fatigue:** Engineers are bombarded with raw data and false positives, making it difficult to pinpoint the actual root cause.
3. **Manual Postmortems:** After resolving an incident, writing incident reports and postmortems is a tedious, manual process that relies on human memory rather than grounded data.

**The result?** High downtime costs, stressed engineering teams, and slow response times.

---

## 🚀 The Solution

This platform is a centralized, real-time command center for infrastructure observability. It solves the aforementioned problems through three core pillars:

1. **Automated, Concurrent Polling:** A highly optimized background worker continuously monitors registered services (APIs, Databases, Webhooks) and calculates rolling-window latency and uptime.
2. **Real-Time Telemetry Streaming:** The moment a service degrades, the platform broadcasts the anomaly via WebSockets directly to the frontend, instantly updating custom vector charts without requiring a page refresh.
3. **Generative AI Postmortems:** Instead of engineers manually writing reports, the platform streams the incident telemetry, alert history, and logs into a Large Language Model (Google Gemini), which automatically synthesizes a grounded Root Cause Analysis (RCA) and next steps.

---

## 🛠️ Technical Architecture & Stack

This project was engineered to mimic the rigorous standards of enterprise B2B SaaS platforms.

### Frontend
- **Framework:** React (Vite) + React Router DOM
- **State Management:** Zustand (for highly reactive, boilerplate-free global state)
- **UI/UX System:** Custom built "Cybernetic Glassmorphism" design system using CSS Variables. **Zero third-party component libraries** (No Tailwind, No Material-UI).
- **Data Visualization:** A custom, zero-dependency SVG `<TelemetryChart />` engine built from scratch to prevent the main-thread blocking typical of heavy charting libraries like Recharts or Chart.js.

### Backend
- **Runtime:** Node.js + Express
- **Database:** MongoDB + Mongoose (with strict Schema definitions)
- **Real-Time Engine:** Socket.IO (with strictly scoped `workspaceId` rooms for data privacy)
- **Validation:** Zod (guaranteeing strict payload integrity and preventing NoSQL injection)
- **Task Scheduling:** `node-cron` driving a bounded concurrent semaphore worker.
- **AI Integration:** `@google/generative-ai` (Gemini 3.5-flash) with graceful degradation heuristics.

---

## 💡 Key Engineering Features

### 1. Bounded Concurrency Background Workers
Blindly pinging hundreds of URLs simultaneously causes memory leaks and exhausted file descriptors. This platform utilizes a custom **Bounded Semaphore** pattern within its cron job. It fetches batches of services and polls them in controlled parallel streams, protecting the Node.js event loop.

### 2. Multi-Tenant WebSocket Isolation
Real-time architecture is dangerous if data bleeds across users. When a WebSocket connects, the backend reads the JWT payload and forces the socket to join a specific `workspace:{id}` room. Telemetry events are *only* broadcast to authorized rooms.

### 3. Enterprise Authentication (JWT Rotation & RBAC)
The authentication flow uses a dual-token strategy.
- **Access Tokens:** Short-lived (15 minutes) for API authorization.
- **Refresh Tokens:** Long-lived, securely rotated tokens stored in HTTP-only cookies.

This mitigates XSS attacks while providing a seamless login experience. All endpoints are protected by strict Role-Based Access Control (RBAC).

### 4. AI "Graceful Degradation"
The AI Postmortem feature doesn't crash if the Google Gemini API key is missing or if the API rate-limits. It implements a fallback heuristic function that analyzes the raw data arrays and dynamically generates a text-based summary locally.

### 5. High-Performance UX (Command Palette & Skeletons)
To cater to power-users, the platform features a global fuzzy-search Command Palette (`Ctrl+K`). Asynchronous data fetching is masked by smooth, animated skeleton loaders rather than jarring spinners. Unbounded list endpoints utilize **pagination** to optimize performance.

### 6. Security and Data Integrity
- **Cascading Cleanup:** Automatic recursive deletion of all related metrics, logs, incidents, and alerts when a service is deleted.
- **Encryption at Rest:** Sensitive configuration fields like `Service.apiKey` are encrypted at rest using AES-256-GCM.
- **SSRF Protection:** Webhooks and status checks actively block private IP ranges. To bypass this for internal networks, `ALLOW_INTERNAL_TARGETS=true` must be configured.
- **Comprehensive Audit Logging:** Every mutating route operation is tracked via a robust audit logging system.

### 7. Reliability
Code is covered by a suite of **integration tests** using Jest, Supertest, and an in-memory MongoDB setup to ensure logic regressions (like cascading deletions) are caught early.

---

## 🚦 Running Locally

1. **Clone & Install:**
   ```bash
   git clone https://github.com/Jeyasaravanan18/Service-Monitoring-and-Incident-Management-Platform.git
   cd Service-Monitoring-and-Incident-Management-Platform

   # Install Backend
   cd server && npm install

   # Install Frontend
   cd client && npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file in the root directory:
   ```env
   PORT=4000
   CLIENT_ORIGIN=http://127.0.0.1:5173
   MONGO_URI=mongodb://127.0.0.1:27017/smimp
   JWT_ACCESS_SECRET=your_super_secret_access_key
   JWT_REFRESH_SECRET=your_super_secret_refresh_key
   GEMINI_API_KEY=your_google_gemini_key
   APP_NAME=Service Monitoring and Incident Management Platform
   ENCRYPTION_KEY=a_32_byte_hex_string_here
   ALLOW_INTERNAL_TARGETS=false
   ```

3. **Start the Platform:**
   ```bash
   # Terminal 1: Backend
   cd server && npm run dev

   # Terminal 2: Frontend
   cd client && npm run dev
   ```

4. **Access the Platform:** Open `http://127.0.0.1:5173` in your browser.
