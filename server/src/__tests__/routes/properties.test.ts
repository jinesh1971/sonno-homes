import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import http from "http";
import propertyRoutes from "../../routes/properties.js";

// Mock prisma
vi.mock("../../lib/prisma.js", () => ({
  default: {
    property: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    investment: { findMany: vi.fn() },
  },
}));

// Mock auth middleware to inject a test user
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
    requireOrg: (req: any, _res: any, next: any) => next(),
  };
});

import prisma from "../../lib/prisma.js";
import { errorHandler } from "../../middleware/errorHandler.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/properties", propertyRoutes);
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

describe("Properties routes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("GET /api/v1/properties returns list for admin", async () => {
    const mockProps = [{ id: "p1", name: "Villa Serena" }];
    (prisma.property.findMany as any).mockResolvedValue(mockProps);
    (prisma.property.count as any).mockResolvedValue(1);

    const app = createApp();
    const res = await request(app, "GET", "/api/v1/properties");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.properties).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  it("GET /api/v1/properties/:id returns 404 for missing property", async () => {
    (prisma.property.findFirst as any).mockResolvedValue(null);
    const app = createApp();
    const res = await request(app, "GET", "/api/v1/properties/00000000-0000-0000-0000-000000000001");
    expect(res.status).toBe(404);
  });

  it("POST /api/v1/properties creates property for admin", async () => {
    const newProp = { id: "p2", name: "Casa del Sole", propertyType: "Villa", location: "Amalfi Coast" };
    (prisma.property.create as any).mockResolvedValue(newProp);

    const app = createApp();
    const res = await request(app, "POST", "/api/v1/properties", {
      name: "Casa del Sole", propertyType: "Villa", location: "Amalfi Coast",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Casa del Sole");
  });

  it("POST /api/v1/properties returns 403 for investor", async () => {
    const app = createApp();
    const res = await request(app, "POST", "/api/v1/properties",
      { name: "Test", propertyType: "Villa", location: "Rome" },
      { "x-test-role": "investor" }
    );
    expect(res.status).toBe(403);
  });

  it("POST /api/v1/properties returns 400 for invalid data", async () => {
    const app = createApp();
    const res = await request(app, "POST", "/api/v1/properties", { name: "" });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/v1/properties/:id updates property", async () => {
    const existing = { id: "p1", name: "Old Name", orgId: "org-1" };
    (prisma.property.findFirst as any).mockResolvedValue(existing);
    (prisma.property.update as any).mockResolvedValue({ ...existing, name: "New Name" });

    const app = createApp();
    const res = await request(app, "PATCH", "/api/v1/properties/00000000-0000-0000-0000-000000000001", { name: "New Name" });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("New Name");
  });

  it("DELETE /api/v1/properties/:id soft-deletes property", async () => {
    (prisma.property.findFirst as any).mockResolvedValue({ id: "p1", orgId: "org-1" });
    (prisma.property.update as any).mockResolvedValue({});

    const app = createApp();
    const res = await request(app, "DELETE", "/api/v1/properties/00000000-0000-0000-0000-000000000001");
    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe("Property deleted");
  });
});
