import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { resolveUser, requireRole, requireOrg } from "../middleware/auth.js";

const router = Router();
router.use(resolveUser, requireOrg);

// GET /dashboard/admin — admin portfolio KPIs
router.get("/admin", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.dbUser!.orgId;

    const [properties, investments, investors, distributions, reports] = await Promise.all([
      prisma.property.findMany({ where: { orgId, deletedAt: null }, select: { id: true, propertyValue: true, status: true, contractYears: true, acquisitionDate: true } }),
      prisma.investment.findMany({ where: { property: { orgId }, deletedAt: null }, select: { amount: true, status: true } }),
      prisma.user.count({ where: { orgId, role: "investor", deletedAt: null } }),
      prisma.distribution.findMany({ where: { investment: { property: { orgId } } }, select: { amount: true, status: true } }),
      prisma.performanceReport.findMany({ where: { property: { orgId }, status: "published", deletedAt: null }, select: { grossRevenue: true, totalExpenses: true, managementFee: true } }),
    ]);

    const totalPortfolioValue = properties.reduce((s: number, p: any) => s + Number(p.propertyValue || 0), 0);
    const totalCommitted = investments.filter((i: any) => i.status === "active").reduce((s: number, i: any) => s + Number(i.amount), 0);
    const totalDistributed = distributions.filter((d: any) => d.status === "paid").reduce((s: number, d: any) => s + Number(d.amount), 0);
    const totalRevenue = reports.reduce((s: number, r: any) => s + Number(r.grossRevenue), 0);
    const totalExpenses = reports.reduce((s: number, r: any) => s + Number(r.totalExpenses), 0);
    const totalMgmtFees = reports.reduce((s: number, r: any) => s + Number(r.managementFee), 0);

    // Contract expiry: properties expiring within 6 months
    const now = new Date();
    const sixMonths = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    const expiringContracts = properties.filter((p: any) => {
      if (!p.acquisitionDate) return false;
      const expiry = new Date(p.acquisitionDate);
      expiry.setFullYear(expiry.getFullYear() + (p.contractYears || 5));
      return expiry <= sixMonths && expiry >= now;
    }).length;

    res.json({
      success: true,
      data: {
        totalProperties: properties.length,
        activeProperties: properties.filter((p: any) => p.status === "active").length,
        totalInvestors: investors,
        totalPortfolioValue,
        totalCommitted,
        totalDistributed,
        totalRevenue,
        totalExpenses,
        totalMgmtFees,
        netIncome: totalRevenue - totalExpenses - totalMgmtFees,
        expiringContracts,
      },
    });
  } catch (err) { next(err); }
});

// GET /dashboard/investor — investor personal KPIs
router.get("/investor", requireRole("investor"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.dbUser!.id;

    const investments = await prisma.investment.findMany({
      where: { investorId: userId, deletedAt: null },
      include: {
        property: { select: { id: true, name: true, propertyValue: true, location: true, monthlyYield: true } },
        distributions: { select: { amount: true, status: true } },
      },
    });

    const totalInvested = investments.reduce((s: number, i: any) => s + Number(i.amount), 0);
    const totalDistributed = investments.reduce((s: number, i: any) =>
      s + i.distributions.filter((d: any) => d.status === "paid").reduce((ds: number, d: any) => ds + Number(d.amount), 0), 0);

    // Per-property allocation for pie chart
    const allocation = investments.map((inv: any) => ({
      propertyId: inv.propertyId,
      propertyName: inv.property.name,
      location: inv.property.location,
      invested: Number(inv.amount),
      percentage: totalInvested > 0 ? (Number(inv.amount) / totalInvested) * 100 : 0,
      distributions: inv.distributions.filter((d: any) => d.status === "paid").reduce((s: number, d: any) => s + Number(d.amount), 0),
    }));

    // Per-property ROI
    const roiByProperty = investments.map((inv: any) => {
      const invested = Number(inv.amount);
      const earned = inv.distributions.filter((d: any) => d.status === "paid").reduce((s: number, d: any) => s + Number(d.amount), 0);
      const roi = invested > 0 ? ((earned / invested) * 100) : 0;
      const monthlyYield = Number(inv.property.monthlyYield || 0);
      const monthlyReturn = invested * (monthlyYield / 100);
      const monthsToRecoup = monthlyReturn > 0 ? Math.ceil((invested - earned) / monthlyReturn) : null;

      return {
        propertyId: inv.propertyId,
        propertyName: inv.property.name,
        invested,
        earned,
        roi: Math.round(roi * 100) / 100,
        monthsToRecoup,
      };
    });

    res.json({
      success: true,
      data: {
        totalInvested,
        totalDistributed,
        overallROI: totalInvested > 0 ? Math.round((totalDistributed / totalInvested) * 10000) / 100 : 0,
        propertyCount: investments.length,
        allocation,
        roiByProperty,
      },
    });
  } catch (err) { next(err); }
});

export default router;
