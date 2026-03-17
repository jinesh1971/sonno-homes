import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import { clerkAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import webhookRoutes from "./routes/webhooks.js";
import propertyRoutes from "./routes/properties.js";
import investmentRoutes from "./routes/investments.js";
import userRoutes from "./routes/users.js";
import distributionRoutes from "./routes/distributions.js";
import reportRoutes from "./routes/reports.js";
import documentRoutes from "./routes/documents.js";
import dashboardRoutes from "./routes/dashboard.js";
import exportRoutes from "./routes/exports.js";
import auditRoutes from "./routes/audit.js";
import offeringRoutes from "./routes/offerings.js";
import fundRoutes from "./routes/funds.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// Global middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? false : undefined,
}));
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));

// Webhook routes BEFORE json parser (Clerk needs raw body)
app.use("/api/webhooks", webhookRoutes);

// JSON parser for all other routes
app.use(express.json());

// Health check (public — before Clerk auth)
app.get("/api/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

// Clerk auth (attaches auth info to all protected requests)
if (process.env.NODE_ENV !== "test") {
  if (process.env.DEV_BYPASS_AUTH === "true") {
    // Dev-only: skip Clerk entirely, resolveUser will load user from DB
    console.log("⚠️  DEV_BYPASS_AUTH enabled — Clerk auth is DISABLED");
  } else {
    app.use(clerkAuth);
  }
}

// API routes
app.use("/api/v1/properties", propertyRoutes);
app.use("/api/v1/investments", investmentRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/distributions", distributionRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/exports", exportRoutes);
app.use("/api/v1/audit-log", auditRoutes);
app.use("/api/v1/offerings", offeringRoutes);
app.use("/api/v1/funds", fundRoutes);

// Serve frontend static files in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "../client");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientDist));
  app.get("{*path}", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// Error handler (must be last)
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
