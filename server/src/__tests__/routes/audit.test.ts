import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import http from "http";
import auditRoutes from "../../routes/audit.js";

vi.mock("../../lib/prisma.js", () => ({
  default: {
    auditLog: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("../../middleware/auth.js", async () => {
  const { ForbiddenError } = await import("../../lib/errors.js");
  return {
    resolveUser: (req: any, _res: any, next: any) => {
      req.dbUser = req.headers["x-test-role"] === "investor"
        ? { id: "inv-1", orgId: "org-1", clerkId: "c1", email: "inv@test.com", role: "investor", firstName: "Test", lastName: "Investor" }
        : { id: "adm-1", orgId: "org-1", clerkId: "c2", email: "adm@test.com", role: "admin", firstName: "Test", lastName: "Admin" };
      next();
    },
    requireRole: (...roles: string[]) => (req: any, _res: any, next: any) => {
      if (!roles.includes(req.dbUser.role)) return next(new ForbiddenError());
      next();
    },
    requireOrg: (_req: any, _res: any, next: any) => next(),
  };
});

import prisma from "../../lib/prisma.js";
import { errorHandler } from "../../middleware/errorHandler.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/audit-log", auditRoutes);
  app.use(errorHandler);
  return app;
}

function request(
  app: any, method: string, path: string,
  body?: any, headers?: Record<string, string>
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address() as { port: number };
      const opts: http.RequestOptions = {
        hostname: "localhost", port: addr.port, path, method,
        headers: { "Content-Type": "application/json", ...headers },
      };
      const req = http.request(opts, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          server.close();
          try { resolve({ status: res.statusCode!, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode!, body: data }); }
        });
      });
      req.on("error", (err) => { server.close(); reject(err); });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

describe("Audit Log routes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET /api/v1/audit-log returns paginated logs", async () => {
    (prisma.auditLog.findMany as any).mockResolvedValue([
      { id: "a1", action: "report.published", entityType: "report", user: { firstName: "Test", lastName: "Admin" } },
    ]);
    (prisma.auditLog.count as any).mockResolvedValue(1);

    const app = createApp();
    const res = await request(app, "GET", "/api/v1/audit-log");
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  it("GET /api/v1/audit-log supports action filter", async () => {
    (prisma.auditLog.findMany as any).mockResolvedValue([]);
    (prisma.auditLog.count as any).mockResolvedValue(0);

    const app = createApp();
    const res = await request(app, "GET", "/api/v1/audit-log?action=report.published");
    expect(res.status).toBe(200);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ action: "report.published" }) })
    );
  });

  it("GET /api/v1/audit-log rejects investor", async () => {
    const app = createApp();
    const res = await request(app, "GET", "/api/v1/audit-log", undefined, { "x-test-role": "investor" });
    expect(res.status).toBe(403);
  });
});
