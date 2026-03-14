import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import http from "http";
import userRoutes from "../../routes/users.js";

vi.mock("../../lib/prisma.js", () => ({
  default: {
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    investorProfile: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
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
  app.use("/api/v1/users", userRoutes);
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

describe("Users routes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET /api/v1/users returns list for admin", async () => {
    (prisma.user.findMany as any).mockResolvedValue([{ id: "u1", firstName: "Marco" }]);
    (prisma.user.count as any).mockResolvedValue(1);

    const app = createApp();
    const res = await request(app, "GET", "/api/v1/users");
    expect(res.status).toBe(200);
    expect(res.body.data.users).toHaveLength(1);
  });

  it("GET /api/v1/users returns 403 for investor", async () => {
    const app = createApp();
    const res = await request(app, "GET", "/api/v1/users", undefined, { "x-test-role": "investor" });
    expect(res.status).toBe(403);
  });

  it("GET /api/v1/users/:id returns user details", async () => {
    (prisma.user.findFirst as any).mockResolvedValue({ id: UUID, firstName: "Marco" });

    const app = createApp();
    const res = await request(app, "GET", `/api/v1/users/${UUID}`);
    expect(res.status).toBe(200);
    expect(res.body.data.firstName).toBe("Marco");
  });

  it("PATCH /api/v1/users/:id updates user", async () => {
    (prisma.user.findFirst as any).mockResolvedValue({ id: UUID });
    (prisma.user.update as any).mockResolvedValue({ id: UUID, firstName: "Updated" });

    const app = createApp();
    const res = await request(app, "PATCH", `/api/v1/users/${UUID}`, { firstName: "Updated" });
    expect(res.status).toBe(200);
  });

  it("GET /api/v1/users/:id/profile returns profile", async () => {
    (prisma.investorProfile.findFirst as any).mockResolvedValue({ id: "p1", occupation: "Engineer" });

    const app = createApp();
    const res = await request(app, "GET", `/api/v1/users/${UUID}/profile`);
    expect(res.status).toBe(200);
    expect(res.body.data.occupation).toBe("Engineer");
  });

  it("GET /api/v1/users/:id/profile returns 403 for investor accessing other profile", async () => {
    const app = createApp();
    const res = await request(app, "GET", `/api/v1/users/${UUID}/profile`, undefined, { "x-test-role": "investor" });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/v1/users/:id/profile creates profile if missing", async () => {
    (prisma.investorProfile.findFirst as any).mockResolvedValue(null);
    (prisma.investorProfile.create as any).mockResolvedValue({ id: "p2", occupation: "Doctor" });

    const app = createApp();
    const res = await request(app, "PATCH", `/api/v1/users/${UUID}/profile`, { occupation: "Doctor" });
    expect(res.status).toBe(201);
  });
});
