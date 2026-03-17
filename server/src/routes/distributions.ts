import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { resolveUser, requireRole, requireOrg } from "../middleware/auth.js";
import {
  createDistributionSchema, batchDistributionSchema,
  updateDistributionSchema, uuidParam, paginationQuery,
} from "../lib/validation.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";

const router = Router();
router.use(resolveUser, requireOrg);

// GET /distributions
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = paginationQuery.parse(req.query);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.dbUser!.role === "investor") {
      where.investment = { investorId: req.dbUser!.id, deletedAt: null };
    } else {
      where.investment = { property: { orgId: req.dbUser!.orgId }, deletedAt: null };
    }

    const [distributions, total] = await Promise.all([
      prisma.distribution.findMany({
        where, skip, take: limit,
        include: {
          investment: {
            select: {
              id: true,
              investor: { select: { id: true, firstName: true, lastName: true } },
              property: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { periodStart: "desc" },
      }),
      prisma.distribution.count({ where }),
    ]);

    const propertyDistributions = distributions.map((d) => ({
      ...d,
      productType: "property" as const,
    }));

    if (req.dbUser!.role === "investor") {
      const fundDistributions = await prisma.distribution.findMany({
        where: {
          fundInvestmentId: { not: null },
          fundInvestment: { investorId: req.dbUser!.id },
        },
        include: {
          fundInvestment: {
            select: {
              id: true,
              fund: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { periodStart: "desc" },
      });

      const fundDistributionsWithType = fundDistributions.map((d) => ({
        ...d,
        productType: "fund" as const,
        fundName: d.fundInvestment?.fund.name,
      }));

      res.json({
        success: true,
        data: {
          distributions: propertyDistributions,
          fundDistributions: fundDistributionsWithType,
          total,
          page,
          limit,
        },
      });
    } else {
      res.json({ success: true, data: { distributions: propertyDistributions, total, page, limit } });
    }
  } catch (err) { next(err); }
});

// GET /distributions/summary
router.get("/summary", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if (req.dbUser!.role === "investor") {
      where.investment = { investorId: req.dbUser!.id, deletedAt: null };
    } else {
      where.investment = { property: { orgId: req.dbUser!.orgId }, deletedAt: null };
    }

    const [totalPaid, totalPending, allDists] = await Promise.all([
      prisma.distribution.aggregate({ where: { ...where, status: "paid" }, _sum: { amount: true }, _count: true }),
      prisma.distribution.aggregate({ where: { ...where, status: "pending" }, _sum: { amount: true }, _count: true }),
      prisma.distribution.aggregate({ where, _sum: { amount: true }, _count: true }),
    ]);

    res.json({
      success: true,
      data: {
        totalDistributed: totalPaid._sum.amount || 0,
        totalPending: totalPending._sum.amount || 0,
        totalAll: allDists._sum.amount || 0,
        countPaid: totalPaid._count,
        countPending: totalPending._count,
        countAll: allDists._count,
      },
    });
  } catch (err) { next(err); }
});

// GET /distributions/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const where: any = { id };
    if (req.dbUser!.role === "investor") {
      where.investment = { investorId: req.dbUser!.id };
    }

    const distribution = await prisma.distribution.findFirst({
      where,
      include: {
        investment: {
          include: {
            investor: { select: { id: true, firstName: true, lastName: true } },
            property: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!distribution) throw new NotFoundError("Distribution", id);
    res.json({ success: true, data: distribution });
  } catch (err) { next(err); }
});

// POST /distributions (admin only)
router.post("/", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createDistributionSchema.parse(req.body);

    if (new Date(data.periodEnd) <= new Date(data.periodStart)) {
      throw new ValidationError("periodEnd must be after periodStart");
    }

    // Verify investment belongs to org
    const investment = await prisma.investment.findFirst({
      where: { id: data.investmentId, deletedAt: null, property: { orgId: req.dbUser!.orgId } },
    });
    if (!investment) throw new NotFoundError("Investment", data.investmentId);

    const distribution = await prisma.distribution.create({
      data: {
        investmentId: data.investmentId,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        amount: data.amount,
        distType: data.distType,
        notes: data.notes,
      },
    });
    res.status(201).json({ success: true, data: distribution });
  } catch (err) { next(err); }
});

// POST /distributions/batch (admin only)
router.post("/batch", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = batchDistributionSchema.parse(req.body);

    if (new Date(data.periodEnd) <= new Date(data.periodStart)) {
      throw new ValidationError("periodEnd must be after periodStart");
    }

    // Verify all investments belong to org
    const investments = await prisma.investment.findMany({
      where: { id: { in: data.investmentIds }, deletedAt: null, property: { orgId: req.dbUser!.orgId } },
    });
    if (investments.length !== data.investmentIds.length) {
      throw new ValidationError("One or more investment IDs are invalid");
    }

    const distributions = await prisma.$transaction(
      data.investmentIds.map((investmentId) =>
        prisma.distribution.create({
          data: {
            investmentId,
            periodStart: new Date(data.periodStart),
            periodEnd: new Date(data.periodEnd),
            amount: data.amounts[investmentId] ?? 0,
            distType: data.distType,
          },
        })
      )
    );

    res.status(201).json({ success: true, data: { created: distributions.length, distributions } });
  } catch (err) { next(err); }
});

// PATCH /distributions/:id (admin only)
router.patch("/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const data = updateDistributionSchema.parse(req.body);

    const existing = await prisma.distribution.findFirst({
      where: { id, investment: { property: { orgId: req.dbUser!.orgId } } },
    });
    if (!existing) throw new NotFoundError("Distribution", id);

    const updateData: any = { ...data };
    if (data.status === "paid" && existing.status !== "paid") {
      updateData.paidAt = new Date();
    }

    const distribution = await prisma.distribution.update({ where: { id }, data: updateData });
    res.json({ success: true, data: distribution });
  } catch (err) { next(err); }
});

export default router;
