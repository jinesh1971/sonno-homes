import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import http from "http";
import dashboardRoutes from "../../routes/dashboard.js";

vi.mock("../../lib/prisma.js", () => ({
  default: {
    property: { findMany: vi.fn() },
    investment: { findMany: vi.fn() },
    user: { count: vi.fn() },
    distribution: { findMany: vi.fn() },
    performanceReport: { findMany: vi.fn() },
    fundInvestment: { findMany: vi.fn() },
    fund: { count: vi.fn() },
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
  app.use("/api/v1/dashboard", dashboardRoutes);
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

describe("Dashboard routes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET /api/v1/dashboard/admin returns portfolio KPIs", async () => {
    (prisma.property.findMany as any).mockResolvedValue([
      { id: "p1", propertyValue: "500000", status: "active", contractYears: 5, acquisitionDate: null },
      { id: "p2", propertyValue: "300000", status: "active", contractYears: 5, acquisitionDate: null },
    ]);
    (prisma.investment.findMany as any).mockResolvedValue([
      { amount: "100000", status: "active" },
      { amount: "50000", status: "active" },
    ]);
    (prisma.user.count as any).mockResolvedValue(5);
    (prisma.distribution.findMany as any).mockResolvedValue([
      { amount: "2000", status: "paid" },
      { amount: "1500", status: "paid" },
      { amount: "1000", status: "pending" },
    ]);
    (prisma.performanceReport.findMany as any).mockResolvedValue([
      { grossRevenue: "8000", totalExpenses: "3000", managementFee: "1000" },
    ]);
    (prisma.fundInvestment.findMany as any)
      .mockResolvedValueOnce([
        { amount: "200000", investorId: "inv-1" },
        { amount: "100000", investorId: "inv-2" },
      ])
      .mockResolvedValueOnce([
        { investorId: "inv-1" },
        { investorId: "inv-2" },
      ]);
    (prisma.fund.count as any).mockResolvedValue(3);

    const app = createApp();
    const res = await request(app, "GET", "/api/v1/dashboard/admin");
    expect(res.status).toBe(200);
    expect(res.body.data.totalProperties).toBe(2);
    expect(res.body.data.activeProperties).toBe(2);
    expect(res.body.data.totalInvestors).toBe(5);
    expect(res.body.data.totalPortfolioValue).toBe(800000);
    expect(res.body.data.totalCommitted).toBe(150000);
    expect(res.body.data.totalDistributed).toBe(3500);
    expect(res.body.data.totalRevenue).toBe(8000);
    expect(res.body.data.netIncome).toBe(4000); // 8000 - 3000 - 1000
    expect(res.body.data.fundMetrics).toEqual({
      totalFundAUM: 300000,
      activeFundCount: 3,
      fundInvestorCount: 2,
    });
  });

  it("GET /api/v1/dashboard/admin rejects investor", async () => {
    const app = createApp();
    const res = await request(app, "GET", "/api/v1/dashboard/admin", undefined, { "x-test-role": "investor" });
    expect(res.status).toBe(403);
  });

  it("GET /api/v1/dashboard/investor returns personal KPIs", async () => {
    (prisma.investment.findMany as any).mockResolvedValue([
      {
        propertyId: "p1", amount: "100000",
        property: { id: "p1", name: "Villa Serena", propertyValue: "500000", location: "Tuscany", monthlyYield: "0.8" },
        distributions: [
          { amount: "2000", status: "paid" },
          { amount: "1500", status: "paid" },
        ],
      },
      {
        propertyId: "p2", amount: "50000",
        property: { id: "p2", name: "Palazzo Azzurro", propertyValue: "300000", location: "Amalfi", monthlyYield: "1.0" },
        distributions: [
          { amount: "800", status: "paid" },
        ],
      },
    ]);
    (prisma.fundInvestment.findMany as any).mockResolvedValue([
      { amount: "75000", distributions: [{ amount: "3000", status: "paid" }, { amount: "2000", status: "pending" }] },
      { amount: "25000", distributions: [{ amount: "1000", status: "paid" }] },
    ]);

    const app = createApp();
    const res = await request(app, "GET", "/api/v1/dashboard/investor", undefined, { "x-test-role": "investor" });
    expect(res.status).toBe(200);
    expect(res.body.data.totalInvested).toBe(150000);
    expect(res.body.data.totalDistributed).toBe(4300);
    expect(res.body.data.propertyCount).toBe(2);
    expect(res.body.data.allocation).toHaveLength(2);
    expect(res.body.data.roiByProperty).toHaveLength(2);
    // Check allocation percentages
    expect(res.body.data.allocation[0].percentage).toBeCloseTo(66.67, 1);
    expect(res.body.data.allocation[1].percentage).toBeCloseTo(33.33, 1);
    // Fund metrics
    expect(res.body.data.fundMetrics).toEqual({
      totalFundInvested: 100000,
      totalFundDistributions: 4000, // 3000 paid + 1000 paid (pending excluded)
      fundROI: 4, // (4000 / 100000) * 100
    });
  });

  it("GET /api/v1/dashboard/investor rejects admin", async () => {
    const app = createApp();
    const res = await request(app, "GET", "/api/v1/dashboard/investor");
    expect(res.status).toBe(403);
  });
});
