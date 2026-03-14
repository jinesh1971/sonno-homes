import prisma from "./prisma.js";

export interface AuditEntry {
  orgId: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({ data: { ...entry, metadata: entry.metadata as any } });
  } catch (err) {
    // Don't let audit failures break the main flow
    console.error("Audit log failed:", err);
  }
}
