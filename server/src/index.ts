import express from "express";
import cors from "cors";
import helmet from "helmet";
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

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// Global middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));

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
  app.use(clerkAuth);
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

// Error handler (must be last)
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
