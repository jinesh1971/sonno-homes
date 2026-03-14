import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import http from "http";
import reportRoutes from "../../routes/reports.js";

vi.mock("../../lib/prisma.js", () => ({
  default: {
    performanceReport: {
      findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(),
      create: vi.fn(), update: vi.fn(),
    },
    reportExpense: {
      findMany: vi.fn(), findFirst: vi.fn(),
      create: vi.fn(), update: vi.fn(), delete: vi.fn(),
    },
    property: { findFirst: vi.fn() },
    organization: { findFirst: vi.fn() },
    investment: { findMany: vi.fn() },
    document: { create: vi.fn() },
    documentRecipient: { createMany: vi.fn() },
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
  app.use("/api/v1/reports", reportRoutes);
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

const UUID = "00000000-0000-0000-0000-000000000001";
const UUID2 = "00000000-0000-0000-0000-000000000002";

describe("Reports routes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("POST /api/v1/reports creates draft report", async () => {
    (prisma.property.findFirst as any).mockResolvedValue({ id: UUID });
    (prisma.organization.findFirst as any).mockResolvedValue({ id: "org-1", managementFee: "0.2000" });
    (prisma.performanceReport.create as any).mockResolvedValue({ id: "r1", status: "draft" });

    const app = createApp();
    const res = await request(app, "POST", "/api/v1/reports", {
      propertyId: UUID, periodStart: "2025-01-01", periodEnd: "2025-01-31",
      nightsBooked: 25, grossRevenue: 8000,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("draft");
  });

  it("POST /api/v1/reports returns 400 for invalid dates", async () => {
    const app = createApp();
    const res = await request(app, "POST", "/api/v1/reports", {
      propertyId: UUID, periodStart: "2025-02-01", periodEnd: "2025-01-01",
      nightsBooked: 25, grossRevenue: 8000,
    });
    expect(res.status).toBe(400);
  });

  it("GET /api/v1/reports returns list with computed fields", async () => {
    (prisma.performanceReport.findMany as any).mockResolvedValue([
      { id: "r1", grossRevenue: "8000", totalExpenses: "3000", managementFee: "1000", expenses: [] },
    ]);
    (prisma.performanceReport.count as any).mockResolvedValue(1);

    const app = createApp();
    const res = await request(app, "GET", "/api/v1/reports");
    expect(res.status).toBe(200);
    expect(res.body.data.reports[0].grossProfit).toBe(5000);
    expect(res.body.data.reports[0].netProfit).toBe(4000);
  });

  it("PATCH /api/v1/reports/:id rejects non-draft", async () => {
    (prisma.performanceReport.findFirst as any).mockResolvedValue({ id: UUID, status: "published" });

    const app = createApp();
    const res = await request(app, "PATCH", `/api/v1/reports/${UUID}`, { nightsBooked: 28 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("draft");
  });

  it("DELETE /api/v1/reports/:id rejects published report", async () => {
    (prisma.performanceReport.findFirst as any).mockResolvedValue({ id: UUID, status: "published" });

    const app = createApp();
    const res = await request(app, "DELETE", `/api/v1/reports/${UUID}`);
    expect(res.status).toBe(400);
  });

  it("POST /api/v1/reports/:id/publish succeeds with expenses", async () => {
    (prisma.performanceReport.findFirst as any).mockResolvedValue({
      id: UUID, status: "draft", propertyId: UUID2,
      grossRevenue: "8000", totalExpenses: "3000", managementFee: "0",
      periodStart: new Date("2025-01-01"),
      expenses: [{ id: "e1", amount: "3000" }],
      property: { id: UUID2, name: "Villa Serena" },
    });
    (prisma.organization.findFirst as any).mockResolvedValue({ id: "org-1", managementFee: "0.2000" });
    (prisma.performanceReport.update as any).mockResolvedValue({ id: UUID, status: "published" });
    (prisma.document.create as any).mockResolvedValue({ id: "doc-1" });
    (prisma.investment.findMany as any).mockResolvedValue([{ investorId: "inv-1" }, { investorId: "inv-2" }]);
    (prisma.documentRecipient.createMany as any).mockResolvedValue({ count: 2 });

    const app = createApp();
    const res = await request(app, "POST", `/api/v1/reports/${UUID}/publish`);
    expect(res.status).toBe(200);
    expect(res.body.data.sharedWith).toBe(2);
    expect(prisma.document.create).toHaveBeenCalled();
    expect(prisma.documentRecipient.createMany).toHaveBeenCalled();
  });

  it("POST /api/v1/reports/:id/publish rejects with no expenses", async () => {
    (prisma.performanceReport.findFirst as any).mockResolvedValue({
      id: UUID, status: "draft", grossRevenue: "8000", totalExpenses: "0",
      expenses: [], property: { name: "Test" },
    });

    const app = createApp();
    const res = await request(app, "POST", `/api/v1/reports/${UUID}/publish`);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("expense");
  });

  it("POST /api/v1/reports/:id/publish rejects with zero revenue", async () => {
    (prisma.performanceReport.findFirst as any).mockResolvedValue({
      id: UUID, status: "draft", grossRevenue: "0", totalExpenses: "0",
      expenses: [{ id: "e1" }], property: { name: "Test" },
    });

    const app = createApp();
    const res = await request(app, "POST", `/api/v1/reports/${UUID}/publish`);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("revenue");
  });
});

describe("Report Expenses routes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("POST /api/v1/reports/:id/expenses adds expense and recalcs", async () => {
    (prisma.performanceReport.findFirst as any).mockResolvedValue({ id: UUID, status: "draft" });
    (prisma.reportExpense.create as any).mockResolvedValue({ id: "e1", category: "Cleaning", amount: 500 });
    (prisma.reportExpense.findMany as any).mockResolvedValue([{ amount: "500" }, { amount: "300" }]);
    (prisma.performanceReport.update as any).mockResolvedValue({});

    const app = createApp();
    const res = await request(app, "POST", `/api/v1/reports/${UUID}/expenses`, {
      category: "Cleaning", amount: 500,
    });
    expect(res.status).toBe(201);
    expect(prisma.performanceReport.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { totalExpenses: 800 } })
    );
  });

  it("POST /api/v1/reports/:id/expenses rejects on published report", async () => {
    (prisma.performanceReport.findFirst as any).mockResolvedValue({ id: UUID, status: "published" });

    const app = createApp();
    const res = await request(app, "POST", `/api/v1/reports/${UUID}/expenses`, {
      category: "Cleaning", amount: 500,
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /api/v1/reports/:id/expenses/:expenseId removes and recalcs", async () => {
    (prisma.reportExpense.findFirst as any).mockResolvedValue({ id: UUID2, reportId: UUID });
    (prisma.reportExpense.delete as any).mockResolvedValue({});
    (prisma.reportExpense.findMany as any).mockResolvedValue([{ amount: "300" }]);
    (prisma.performanceReport.update as any).mockResolvedValue({});

    const app = createApp();
    const res = await request(app, "DELETE", `/api/v1/reports/${UUID}/expenses/${UUID2}`);
    expect(res.status).toBe(200);
    expect(prisma.performanceReport.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { totalExpenses: 300 } })
    );
  });
});
