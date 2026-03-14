import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { resolveUser, requireRole, requireOrg } from "../middleware/auth.js";
import { createPropertySchema, updatePropertySchema, uuidParam, paginationQuery } from "../lib/validation.js";
import { NotFoundError } from "../lib/errors.js";

const router = Router();

// All property routes require auth + org
router.use(resolveUser, requireOrg);

// GET /properties — list (admin: all, investor: linked via investments)
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = paginationQuery.parse(req.query);
    const orgId = req.dbUser!.orgId;
    const skip = (page - 1) * limit;

    const where: any = { orgId, deletedAt: null };

    if (req.dbUser!.role === "investor") {
      where.investments = { some: { investorId: req.dbUser!.id, deletedAt: null } };
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.property.count({ where }),
    ]);

    res.json({ success: true, data: { properties, total, page, limit } });
  } catch (err) { next(err); }
});

// GET /properties/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const property = await prisma.property.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!property) throw new NotFoundError("Property", id);
    res.json({ success: true, data: property });
  } catch (err) { next(err); }
});

// POST /properties (admin only)
router.post("/", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createPropertySchema.parse(req.body);
    const property = await prisma.property.create({
      data: {
        ...data,
        orgId: req.dbUser!.orgId,
        acquisitionDate: data.acquisitionDate ? new Date(data.acquisitionDate) : undefined,
      },
    });
    res.status(201).json({ success: true, data: property });
  } catch (err) { next(err); }
});

// PATCH /properties/:id (admin only)
router.patch("/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const data = updatePropertySchema.parse(req.body);

    const existing = await prisma.property.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError("Property", id);

    const property = await prisma.property.update({
      where: { id },
      data: {
        ...data,
        acquisitionDate: data.acquisitionDate ? new Date(data.acquisitionDate) : undefined,
      },
    });
    res.json({ success: true, data: property });
  } catch (err) { next(err); }
});

// DELETE /properties/:id (admin only, soft delete)
router.delete("/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const existing = await prisma.property.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError("Property", id);

    await prisma.property.update({ where: { id }, data: { deletedAt: new Date() } });
    res.json({ success: true, data: { message: "Property deleted" } });
  } catch (err) { next(err); }
});

// GET /properties/:id/investors (admin only)
router.get("/:id/investors", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const investments = await prisma.investment.findMany({
      where: { propertyId: id, deletedAt: null, property: { orgId: req.dbUser!.orgId } },
      include: { investor: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
    });
    res.json({ success: true, data: investments });
  } catch (err) { next(err); }
});

export default router;
