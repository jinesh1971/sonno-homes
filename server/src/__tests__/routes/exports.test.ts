import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import http from "http";
import exportRoutes from "../../routes/exports.js";

vi.mock("../../lib/prisma.js", () => ({
  default: {
    user: { findMany: vi.fn() },
    property: { findMany: vi.fn() },
    distribution: { findMany: vi.fn() },
    performanceReport: { findFirst: vi.fn() },
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
  app.use("/api/v1/exports", exportRoutes);
  app.use(errorHandler);
  return app;
}

function request(
  app: any, method: string, path: string,
  body?: any, headers?: Record<string, string>
): Promise<{ status: number; body: string; headers: any }> {
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
          resolve({ status: res.statusCode!, body: data, headers: res.headers });
        });
      });
      req.on("error", (err) => { server.close(); reject(err); });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

describe("Export routes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET /api/v1/exports/investors returns CSV", async () => {
    (prisma.user.findMany as any).mockResolvedValue([
      {
        firstName: "Marco", lastName: "Bianchi", email: "marco@test.com", phone: "+39123",
        isActive: true, investorProfile: { city: "Milan", country: "Italy" },
        investments: [{ amount: "100000" }],
      },
    ]);

    const app = createApp();
    const res = await request(app, "GET", "/api/v1/exports/investors");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.body).toContain("Marco Bianchi");
    expect(res.body).toContain("100000");
  });

  it("GET /api/v1/exports/properties returns CSV", async () => {
    (prisma.property.findMany as any).mockResolvedValue([
      {
        name: "Villa Serena", propertyType: "Villa", location: "Tuscany", region: "Toscana",
        propertyValue: "500000", status: "active", bedrooms: 4,
        investments: [{ amount: "100000" }, { amount: "50000" }],
      },
    ]);

    const app = createApp();
    const res = await request(app, "GET", "/api/v1/exports/properties");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.body).toContain("Villa Serena");
    expect(res.body).toContain("150000");
  });

  it("GET /api/v1/exports/distributions returns CSV", async () => {
    (prisma.distribution.findMany as any).mockResolvedValue([
      {
        periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-01-31"),
        amount: "2000", distType: "monthly", status: "paid", paidAt: new Date("2025-02-01"),
        investment: {
          investor: { firstName: "Marco", lastName: "Bianchi", email: "marco@test.com" },
          property: { name: "Villa Serena" },
        },
      },
    ]);

    const app = createApp();
    const res = await request(app, "GET", "/api/v1/exports/distributions");
    expect(res.status).toBe(200);
    expect(res.body).toContain("Marco Bianchi");
    expect(res.body).toContain("Villa Serena");
    expect(res.body).toContain("2000");
  });

  it("GET /api/v1/exports/investors rejects investor role", async () => {
    const app = createApp();
    const res = await request(app, "GET", "/api/v1/exports/investors", undefined, { "x-test-role": "investor" });
    expect(res.status).toBe(403);
  });

  it("GET /api/v1/exports/my-distributions returns investor's own CSV", async () => {
    (prisma.distribution.findMany as any).mockResolvedValue([
      {
        periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-01-31"),
        amount: "2000", distType: "monthly", status: "paid", paidAt: null,
        investment: { property: { name: "Villa Serena" } },
      },
    ]);

    const app = createApp();
    const res = await request(app, "GET", "/api/v1/exports/my-distributions", undefined, { "x-test-role": "investor" });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.body).toContain("Villa Serena");
  });

  it("GET /api/v1/exports/reports/:id returns report CSV", async () => {
    const UUID = "00000000-0000-0000-0000-000000000001";
    (prisma.performanceReport.findFirst as any).mockResolvedValue({
      id: UUID, nightsBooked: 25,
      grossRevenue: "8000", totalExpenses: "3000", managementFee: "1000",
      periodStart: new Date("2025-01-01"), periodEnd: new Date("2025-01-31"),
      property: { name: "Villa Serena" },
      expenses: [{ category: "Cleaning", amount: "1500" }, { category: "Utilities", amount: "1500" }],
    });

    const app = createApp();
    const res = await request(app, "GET", `/api/v1/exports/reports/${UUID}`);
    expect(res.status).toBe(200);
    expect(res.body).toContain("Villa Serena");
    expect(res.body).toContain("Cleaning");
    expect(res.body).toContain("5000"); // gross profit
  });
});
