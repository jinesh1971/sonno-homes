import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import http from "http";
import distributionRoutes from "../../routes/distributions.js";

vi.mock("../../lib/prisma.js", () => ({
  default: {
    distribution: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    investment: { findFirst: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
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
  app.use("/api/v1/distributions", distributionRoutes);
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

describe("Distributions routes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET /api/v1/distributions returns list", async () => {
    (prisma.distribution.findMany as any).mockResolvedValue([{ id: "d1", amount: 500 }]);
    (prisma.distribution.count as any).mockResolvedValue(1);

    const app = createApp();
    const res = await request(app, "GET", "/api/v1/distributions");
    expect(res.status).toBe(200);
    expect(res.body.data.distributions).toHaveLength(1);
  });

  it("GET /api/v1/distributions/summary returns aggregates", async () => {
    (prisma.distribution.aggregate as any)
      .mockResolvedValueOnce({ _sum: { amount: 5000 }, _count: 10 })
      .mockResolvedValueOnce({ _sum: { amount: 1000 }, _count: 2 })
      .mockResolvedValueOnce({ _sum: { amount: 6000 }, _count: 12 });

    const app = createApp();
    const res = await request(app, "GET", "/api/v1/distributions/summary");
    expect(res.status).toBe(200);
    expect(res.body.data.totalDistributed).toBe(5000);
    expect(res.body.data.totalPending).toBe(1000);
    expect(res.body.data.countAll).toBe(12);
  });

  it("POST /api/v1/distributions creates distribution", async () => {
    (prisma.investment.findFirst as any).mockResolvedValue({ id: UUID });
    (prisma.distribution.create as any).mockResolvedValue({ id: "d2", amount: 750 });

    const app = createApp();
    const res = await request(app, "POST", "/api/v1/distributions", {
      investmentId: UUID, periodStart: "2025-01-01", periodEnd: "2025-01-31", amount: 750,
    });
    expect(res.status).toBe(201);
  });

  it("POST /api/v1/distributions returns 400 when periodEnd <= periodStart", async () => {
    const app = createApp();
    const res = await request(app, "POST", "/api/v1/distributions", {
      investmentId: UUID, periodStart: "2025-02-01", periodEnd: "2025-01-01", amount: 500,
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/v1/distributions returns 403 for investor", async () => {
    const app = createApp();
    const res = await request(app, "POST", "/api/v1/distributions",
      { investmentId: UUID, periodStart: "2025-01-01", periodEnd: "2025-01-31", amount: 500 },
      { "x-test-role": "investor" }
    );
    expect(res.status).toBe(403);
  });

  it("POST /api/v1/distributions/batch creates multiple", async () => {
    (prisma.investment.findMany as any).mockResolvedValue([{ id: UUID }, { id: UUID2 }]);
    (prisma.$transaction as any).mockResolvedValue([{ id: "d3" }, { id: "d4" }]);

    const app = createApp();
    const res = await request(app, "POST", "/api/v1/distributions/batch", {
      investmentIds: [UUID, UUID2],
      periodStart: "2025-01-01", periodEnd: "2025-01-31",
      amounts: { [UUID]: 500, [UUID2]: 750 },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.created).toBe(2);
  });

  it("PATCH /api/v1/distributions/:id marks as paid with paidAt", async () => {
    (prisma.distribution.findFirst as any).mockResolvedValue({ id: UUID, status: "pending" });
    (prisma.distribution.update as any).mockResolvedValue({ id: UUID, status: "paid", paidAt: new Date() });

    const app = createApp();
    const res = await request(app, "PATCH", `/api/v1/distributions/${UUID}`, { status: "paid" });
    expect(res.status).toBe(200);
    expect(prisma.distribution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "paid", paidAt: expect.any(Date) }),
      })
    );
  });

  it("GET /api/v1/distributions/:id returns 404 for missing", async () => {
    (prisma.distribution.findFirst as any).mockResolvedValue(null);
    const app = createApp();
    const res = await request(app, "GET", `/api/v1/distributions/${UUID}`);
    expect(res.status).toBe(404);
  });
});
