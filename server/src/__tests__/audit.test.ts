import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma.js", () => ({
  default: { auditLog: { create: vi.fn() } },
}));

import prisma from "../lib/prisma.js";
import { logAudit } from "../lib/audit.js";

describe("Audit service", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("logAudit creates an audit log entry", async () => {
    (prisma.auditLog.create as any).mockResolvedValue({ id: "a1" });

    await logAudit({
      orgId: "org-1",
      userId: "user-1",
      action: "report.published",
      entityType: "report",
      entityId: "r1",
      metadata: { propertyName: "Villa Serena" },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: "org-1",
        action: "report.published",
        entityType: "report",
      }),
    });
  });

  it("logAudit does not throw on failure", async () => {
    (prisma.auditLog.create as any).mockRejectedValue(new Error("DB down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await logAudit({ orgId: "org-1", action: "test" });

    expect(consoleSpy).toHaveBeenCalledWith("Audit log failed:", expect.any(Error));
    consoleSpy.mockRestore();
  });
});
