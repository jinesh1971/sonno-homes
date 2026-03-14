import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import http from "http";
import documentRoutes from "../../routes/documents.js";

vi.mock("../../lib/prisma.js", () => ({
  default: {
    document: {
      findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(),
      create: vi.fn(), update: vi.fn(),
    },
    documentRecipient: {
      createMany: vi.fn(), updateMany: vi.fn(),
    },
    property: { findFirst: vi.fn() },
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
  app.use("/api/v1/documents", documentRoutes);
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

describe("Documents routes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("POST /api/v1/documents creates document (admin)", async () => {
    (prisma.document.create as any).mockResolvedValue({ id: "doc-1", title: "Contract A" });

    const app = createApp();
    const res = await request(app, "POST", "/api/v1/documents", {
      title: "Contract A", docType: "contract", fileUrl: "uploads/contract-a.pdf",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("Contract A");
  });

  it("POST /api/v1/documents rejects investor", async () => {
    const app = createApp();
    const res = await request(app, "POST", "/api/v1/documents",
      { title: "Test", fileUrl: "test.pdf" },
      { "x-test-role": "investor" }
    );
    expect(res.status).toBe(403);
  });

  it("POST /api/v1/documents validates property belongs to org", async () => {
    (prisma.property.findFirst as any).mockResolvedValue(null);

    const app = createApp();
    const res = await request(app, "POST", "/api/v1/documents", {
      title: "Report", fileUrl: "test.pdf", propertyId: UUID,
    });
    expect(res.status).toBe(404);
  });

  it("GET /api/v1/documents returns list for admin", async () => {
    (prisma.document.findMany as any).mockResolvedValue([
      { id: "doc-1", title: "Contract A", _count: { recipients: 3 } },
    ]);
    (prisma.document.count as any).mockResolvedValue(1);

    const app = createApp();
    const res = await request(app, "GET", "/api/v1/documents");
    expect(res.status).toBe(200);
    expect(res.body.data.documents).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  it("GET /api/v1/documents/:id returns detail and marks viewed for investor", async () => {
    (prisma.document.findFirst as any).mockResolvedValue({
      id: UUID, title: "Contract A", recipients: [{ investorId: "inv-1" }],
    });
    (prisma.documentRecipient.updateMany as any).mockResolvedValue({ count: 1 });

    const app = createApp();
    const res = await request(app, "GET", `/api/v1/documents/${UUID}`, undefined, { "x-test-role": "investor" });
    expect(res.status).toBe(200);
    expect(prisma.documentRecipient.updateMany).toHaveBeenCalled();
  });

  it("PATCH /api/v1/documents/:id updates document (admin)", async () => {
    (prisma.document.findFirst as any).mockResolvedValue({ id: UUID, orgId: "org-1" });
    (prisma.document.update as any).mockResolvedValue({ id: UUID, title: "Updated" });

    const app = createApp();
    const res = await request(app, "PATCH", `/api/v1/documents/${UUID}`, { title: "Updated" });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Updated");
  });

  it("DELETE /api/v1/documents/:id soft deletes (admin)", async () => {
    (prisma.document.findFirst as any).mockResolvedValue({ id: UUID, orgId: "org-1" });
    (prisma.document.update as any).mockResolvedValue({});

    const app = createApp();
    const res = await request(app, "DELETE", `/api/v1/documents/${UUID}`);
    expect(res.status).toBe(200);
    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) })
    );
  });

  it("POST /api/v1/documents/:id/share shares with investors", async () => {
    (prisma.document.findFirst as any).mockResolvedValue({ id: UUID, orgId: "org-1" });
    (prisma.documentRecipient.createMany as any).mockResolvedValue({ count: 2 });

    const app = createApp();
    const res = await request(app, "POST", `/api/v1/documents/${UUID}/share`, {
      investorIds: [UUID, UUID2],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.shared).toBe(2);
  });

  it("POST /api/v1/documents/:id/track-download tracks download", async () => {
    (prisma.documentRecipient.updateMany as any).mockResolvedValue({ count: 1 });

    const app = createApp();
    const res = await request(app, "POST", `/api/v1/documents/${UUID}/track-download`, {}, { "x-test-role": "investor" });
    expect(res.status).toBe(200);
    expect(res.body.data.tracked).toBe(true);
  });
});
