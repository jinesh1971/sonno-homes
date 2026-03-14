import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import http from "http";
import investmentRoutes from "../../routes/investments.js";

vi.mock("../../lib/prisma.js", () => ({
  default: {
    investment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    property: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
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
      if (!roles.includes(req.dbUser.role)) {
        return next(new ForbiddenError());
      }
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
  app.use("/api/v1/investments", investmentRoutes);
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

describe("Investments routes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET /api/v1/investments returns list", async () => {
    (prisma.investment.findMany as any).mockResolvedValue([{ id: "i1" }]);
    (prisma.investment.count as any).mockResolvedValue(1);

    const app = createApp();
    const res = await request(app, "GET", "/api/v1/investments");
    expect(res.status).toBe(200);
    expect(res.body.data.investments).toHaveLength(1);
  });

  it("POST /api/v1/investments creates investment for admin", async () => {
    (prisma.property.findFirst as any).mockResolvedValue({ id: UUID });
    (prisma.user.findFirst as any).mockResolvedValue({ id: UUID });
    (prisma.investment.findFirst as any).mockResolvedValue(null);
    (prisma.investment.create as any).mockResolvedValue({ id: "i2", amount: 10000 });

    const app = createApp();
    const res = await request(app, "POST", "/api/v1/investments", {
      investorId: UUID, propertyId: UUID, amount: 10000, startDate: "2024-01-01",
    });
    expect(res.status).toBe(201);
  });

  it("POST /api/v1/investments returns 403 for investor", async () => {
    const app = createApp();
    const res = await request(app, "POST", "/api/v1/investments",
      { investorId: UUID, propertyId: UUID, amount: 10000, startDate: "2024-01-01" },
      { "x-test-role": "investor" }
    );
    expect(res.status).toBe(403);
  });

  it("POST /api/v1/investments returns 400 for duplicate", async () => {
    (prisma.property.findFirst as any).mockResolvedValue({ id: UUID });
    (prisma.user.findFirst as any).mockResolvedValue({ id: UUID });
    (prisma.investment.findFirst as any).mockResolvedValue({ id: "existing" });

    const app = createApp();
    const res = await request(app, "POST", "/api/v1/investments", {
      investorId: UUID, propertyId: UUID, amount: 10000, startDate: "2024-01-01",
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /api/v1/investments/:id soft-deletes", async () => {
    (prisma.investment.findFirst as any).mockResolvedValue({ id: UUID });
    (prisma.investment.update as any).mockResolvedValue({});

    const app = createApp();
    const res = await request(app, "DELETE", `/api/v1/investments/${UUID}`);
    expect(res.status).toBe(200);
  });
});
