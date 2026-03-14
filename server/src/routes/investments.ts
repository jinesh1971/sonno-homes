import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { resolveUser, requireRole, requireOrg } from "../middleware/auth.js";
import { createInvestmentSchema, updateInvestmentSchema, uuidParam, paginationQuery } from "../lib/validation.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";

const router = Router();
router.use(resolveUser, requireOrg);

// GET /investments
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = paginationQuery.parse(req.query);
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (req.dbUser!.role === "investor") {
      where.investorId = req.dbUser!.id;
    } else {
      where.property = { orgId: req.dbUser!.orgId };
    }

    const [investments, total] = await Promise.all([
      prisma.investment.findMany({
        where, skip, take: limit,
        include: {
          property: { select: { id: true, name: true, location: true, status: true } },
          investor: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.investment.count({ where }),
    ]);

    res.json({ success: true, data: { investments, total, page, limit } });
  } catch (err) { next(err); }
});

// GET /investments/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const where: any = { id, deletedAt: null };
    if (req.dbUser!.role === "investor") where.investorId = req.dbUser!.id;

    const investment = await prisma.investment.findFirst({
      where,
      include: {
        property: true,
        investor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!investment) throw new NotFoundError("Investment", id);
    res.json({ success: true, data: investment });
  } catch (err) { next(err); }
});

// POST /investments (admin only)
router.post("/", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createInvestmentSchema.parse(req.body);

    // Verify property belongs to org
    const property = await prisma.property.findFirst({
      where: { id: data.propertyId, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!property) throw new NotFoundError("Property", data.propertyId);

    // Verify investor belongs to org
    const investor = await prisma.user.findFirst({
      where: { id: data.investorId, orgId: req.dbUser!.orgId, role: "investor", deletedAt: null },
    });
    if (!investor) throw new NotFoundError("Investor", data.investorId);

    // Check for duplicate
    const existing = await prisma.investment.findFirst({
      where: { investorId: data.investorId, propertyId: data.propertyId, deletedAt: null },
    });
    if (existing) throw new ValidationError("Investment already exists for this investor and property");

    const investment = await prisma.investment.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
    res.status(201).json({ success: true, data: investment });
  } catch (err) { next(err); }
});

// PATCH /investments/:id (admin only)
router.patch("/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const data = updateInvestmentSchema.parse(req.body);

    const existing = await prisma.investment.findFirst({
      where: { id, deletedAt: null, property: { orgId: req.dbUser!.orgId } },
    });
    if (!existing) throw new NotFoundError("Investment", id);

    const investment = await prisma.investment.update({
      where: { id },
      data: {
        ...data,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
    res.json({ success: true, data: investment });
  } catch (err) { next(err); }
});

// DELETE /investments/:id (admin only, soft delete)
router.delete("/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const existing = await prisma.investment.findFirst({
      where: { id, deletedAt: null, property: { orgId: req.dbUser!.orgId } },
    });
    if (!existing) throw new NotFoundError("Investment", id);

    await prisma.investment.update({ where: { id }, data: { deletedAt: new Date() } });
    res.json({ success: true, data: { message: "Investment deleted" } });
  } catch (err) { next(err); }
});

export default router;
