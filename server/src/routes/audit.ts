import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { resolveUser, requireRole, requireOrg } from "../middleware/auth.js";
import { paginationQuery } from "../lib/validation.js";
import { z } from "zod";

const router = Router();
router.use(resolveUser, requireOrg, requireRole("admin"));

const auditFilterSchema = z.object({
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// GET /audit-log
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = paginationQuery.parse(req.query);
    const filters = auditFilterSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where: any = { orgId: req.dbUser!.orgId };
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, skip, take: limit,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ success: true, data: { logs, total, page, limit } });
  } catch (err) { next(err); }
});

export default router;
