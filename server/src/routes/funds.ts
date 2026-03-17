import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { resolveUser, requireRole, requireOrg } from "../middleware/auth.js";
import {
  createFundSchema,
  updateFundSchema,
  addFundPropertiesSchema,
  createFundInvestmentSchema,
  createFundReportSchema,
  createFundDistributionSchema,
  uuidParam,
} from "../lib/validation.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import { logAudit } from "../lib/audit.js";
import { sendFundReportNotification } from "../lib/emailService.js";

const router = Router();

// All fund routes require auth + org
router.use(resolveUser, requireOrg);

// POST / — admin creates fund, defaults status to draft
router.post("/", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createFundSchema.parse(req.body);
    const fund = await prisma.fund.create({
      data: {
        ...data,
        orgId: req.dbUser!.orgId,
        status: "draft",
      },
    });

    await logAudit({
      orgId: req.dbUser!.orgId,
      userId: req.dbUser!.id,
      action: "fund.create",
      entityType: "Fund",
      entityId: fund.id,
    });

    res.status(201).json({ success: true, data: fund });
  } catch (err) {
    next(err);
  }
});

// GET / — admin lists all funds for the org
router.get("/", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const funds = await prisma.fund.findMany({
      where: {
        orgId: req.dbUser!.orgId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            fundProperties: { where: { removedAt: null } },
            fundInvestments: true,
          },
        },
      },
    });

    res.json({ success: true, data: funds });
  } catch (err) {
    next(err);
  }
});

// GET /:id — any authenticated user gets fund detail with constituent properties
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const fund = await prisma.fund.findFirst({
      where: {
        id,
        orgId: req.dbUser!.orgId,
        deletedAt: null,
      },
      include: {
        fundProperties: {
          where: { removedAt: null },
          include: {
            property: true,
          },
        },
        _count: {
          select: {
            fundInvestments: true,
          },
        },
      },
    });

    if (!fund) throw new NotFoundError("Fund", id);

    res.json({ success: true, data: fund });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id — admin updates fund details or status
router.patch("/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const data = updateFundSchema.parse(req.body);

    const existing = await prisma.fund.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError("Fund", id);

    // Enforce status transitions
    if (data.status && existing.status === "closed") {
      if (data.status === "open" || data.status === "draft") {
        throw new ValidationError("Closed funds cannot be reopened");
      }
    }

    const fund = await prisma.fund.update({
      where: { id },
      data,
    });

    await logAudit({
      orgId: req.dbUser!.orgId,
      userId: req.dbUser!.id,
      action: "fund.update",
      entityType: "Fund",
      entityId: fund.id,
      metadata: { updatedFields: Object.keys(data) },
    });

    res.json({ success: true, data: fund });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — admin soft-deletes fund
router.delete("/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);

    const existing = await prisma.fund.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError("Fund", id);

    // Block if active investments exist
    const activeInvestments = await prisma.fundInvestment.count({
      where: { fundId: id, status: "active" },
    });
    if (activeInvestments > 0) {
      throw new ValidationError("Cannot delete fund with active investments");
    }

    await prisma.fund.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAudit({
      orgId: req.dbUser!.orgId,
      userId: req.dbUser!.id,
      action: "fund.delete",
      entityType: "Fund",
      entityId: id,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /:id/properties — admin assigns properties to fund
router.post("/:id/properties", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const { propertyIds } = addFundPropertiesSchema.parse(req.body);

    // Verify fund exists and is not soft-deleted
    const fund = await prisma.fund.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!fund) throw new NotFoundError("Fund", id);

    // Check each property for conflicts with other active funds
    for (const propertyId of propertyIds) {
      const conflict = await prisma.fundProperty.findFirst({
        where: {
          propertyId,
          removedAt: null,
          fund: {
            status: { in: ["draft", "open"] },
            deletedAt: null,
            id: { not: id },
          },
        },
        include: {
          property: { select: { name: true } },
          fund: { select: { name: true } },
        },
      });

      if (conflict) {
        throw new ValidationError(
          `Property '${conflict.property.name}' already belongs to fund '${conflict.fund.name}'`
        );
      }
    }

    // Create FundProperty records
    const created = await Promise.all(
      propertyIds.map((propertyId) =>
        prisma.fundProperty.create({
          data: { fundId: id, propertyId },
          include: { property: true },
        })
      )
    );

    await logAudit({
      orgId: req.dbUser!.orgId,
      userId: req.dbUser!.id,
      action: "fund.addProperties",
      entityType: "Fund",
      entityId: id,
      metadata: { propertyIds },
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id/properties/:propertyId — admin removes property from fund
router.delete("/:id/properties/:propertyId", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const propertyId = uuidParam.parse(req.params.propertyId);

    // Verify fund exists and is not soft-deleted
    const fund = await prisma.fund.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!fund) throw new NotFoundError("Fund", id);

    // Find the active FundProperty record
    const fundProperty = await prisma.fundProperty.findFirst({
      where: { fundId: id, propertyId, removedAt: null },
    });
    if (!fundProperty) throw new NotFoundError("FundProperty");

    // Soft remove by setting removedAt
    await prisma.fundProperty.update({
      where: { id: fundProperty.id },
      data: { removedAt: new Date() },
    });

    await logAudit({
      orgId: req.dbUser!.orgId,
      userId: req.dbUser!.id,
      action: "fund.removeProperty",
      entityType: "Fund",
      entityId: id,
      metadata: { propertyId },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /:id/investments — admin creates fund investment
router.post("/:id/investments", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const data = createFundInvestmentSchema.parse(req.body);

    // Verify fund exists and is not soft-deleted
    const fund = await prisma.fund.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!fund) throw new NotFoundError("Fund", id);

    // Fund must be open to accept investments
    if (fund.status !== "open") {
      throw new ValidationError("Fund is not currently accepting investments");
    }

    const investment = await prisma.fundInvestment.create({
      data: {
        fundId: id,
        investorId: data.investorId,
        amount: data.amount,
        startDate: new Date(data.startDate),
      },
    });

    await logAudit({
      orgId: req.dbUser!.orgId,
      userId: req.dbUser!.id,
      action: "fund.createInvestment",
      entityType: "FundInvestment",
      entityId: investment.id,
      metadata: { fundId: id, investorId: data.investorId },
    });

    res.status(201).json({ success: true, data: investment });
  } catch (err) {
    next(err);
  }
});

// GET /:id/investments — admin lists fund investments with computed equity shares
router.get("/:id/investments", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);

    // Verify fund exists and is not soft-deleted
    const fund = await prisma.fund.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!fund) throw new NotFoundError("Fund", id);

    const investments = await prisma.fundInvestment.findMany({
      where: { fundId: id },
      include: {
        investor: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    // Compute total fund amount for equity share calculation
    const totalAmount = investments.reduce(
      (sum, inv) => sum + Number(inv.amount),
      0
    );

    const data = investments.map((inv) => ({
      ...inv,
      equityShare: totalAmount > 0 ? Number(inv.amount) / totalAmount : 0,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── Fund Report Endpoints ───────────────────────────────────────────────────

// Helper: compute quarter date range
function getQuarterDateRange(year: number, quarter: number): { start: Date; end: Date } {
  const monthStart = (quarter - 1) * 3; // 0-indexed: Q1=0, Q2=3, Q3=6, Q4=9
  const start = new Date(Date.UTC(year, monthStart, 1));
  // End is last day of the quarter month
  const end = new Date(Date.UTC(year, monthStart + 3, 0));
  return { start, end };
}

// POST /:id/reports — admin creates fund report for a quarter
router.post("/:id/reports", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const data = createFundReportSchema.parse(req.body);

    // Verify fund exists and is not soft-deleted
    const fund = await prisma.fund.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!fund) throw new NotFoundError("Fund", id);

    const report = await prisma.fundReport.create({
      data: {
        fundId: id,
        quarterYear: data.quarterYear,
        quarterNumber: data.quarterNumber,
        status: "draft",
        createdBy: req.dbUser!.id,
      },
    });

    await logAudit({
      orgId: req.dbUser!.orgId,
      userId: req.dbUser!.id,
      action: "fund.createReport",
      entityType: "FundReport",
      entityId: report.id,
      metadata: { fundId: id, quarterYear: data.quarterYear, quarterNumber: data.quarterNumber },
    });

    res.status(201).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// GET /:id/reports — list fund reports
router.get("/:id/reports", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);

    // Verify fund exists and is not soft-deleted
    const fund = await prisma.fund.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!fund) throw new NotFoundError("Fund", id);

    const reports = await prisma.fundReport.findMany({
      where: { fundId: id },
      orderBy: [
        { quarterYear: "desc" },
        { quarterNumber: "desc" },
      ],
    });

    res.json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
});

// GET /:id/reports/:reportId — get fund report detail with aggregate metrics
router.get("/:id/reports/:reportId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const reportId = uuidParam.parse(req.params.reportId);

    // Verify fund exists and is not soft-deleted
    const fund = await prisma.fund.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
      include: {
        organization: { select: { managementFee: true } },
      },
    });
    if (!fund) throw new NotFoundError("Fund", id);

    // Find the fund report
    const report = await prisma.fundReport.findFirst({
      where: { id: reportId, fundId: id },
    });
    if (!report) throw new NotFoundError("FundReport", reportId);

    // Get constituent properties (active: removedAt is null AND property.deletedAt is null)
    const fundProperties = await prisma.fundProperty.findMany({
      where: {
        fundId: id,
        removedAt: null,
        property: { deletedAt: null },
      },
      include: {
        property: { select: { id: true, name: true } },
      },
    });

    // Compute quarter date range
    const { start: quarterStart, end: quarterEnd } = getQuarterDateRange(
      report.quarterYear,
      report.quarterNumber
    );

    // For each constituent property, find published PerformanceReport records that overlap the quarter
    const propertyIds = fundProperties.map((fp) => fp.propertyId);

    const performanceReports = await prisma.performanceReport.findMany({
      where: {
        propertyId: { in: propertyIds },
        periodStart: { gte: quarterStart },
        periodEnd: { lte: quarterEnd },
        status: "published",
      },
    });

    // Group reports by propertyId
    const reportsByProperty = new Map<string, typeof performanceReports>();
    for (const pr of performanceReports) {
      const existing = reportsByProperty.get(pr.propertyId) || [];
      existing.push(pr);
      reportsByProperty.set(pr.propertyId, existing);
    }

    // Compute aggregate metrics
    let totalGrossRevenue = 0;
    let totalExpenses = 0;
    let totalNightsBooked = 0;
    let totalNightsAvailable = 0;
    let occupancySum = 0;
    let occupancyCount = 0;

    const breakdown: Array<{
      propertyId: string;
      propertyName: string;
      revenue: number;
      expenses: number;
      occupancy: number | null;
    }> = [];

    const warnings: string[] = [];

    for (const fp of fundProperties) {
      const propReports = reportsByProperty.get(fp.propertyId) || [];

      if (propReports.length === 0) {
        warnings.push(
          `Property '${fp.property.name}' has no published report for Q${report.quarterNumber} ${report.quarterYear}`
        );
        breakdown.push({
          propertyId: fp.propertyId,
          propertyName: fp.property.name,
          revenue: 0,
          expenses: 0,
          occupancy: null,
        });
        continue;
      }

      let propRevenue = 0;
      let propExpenses = 0;
      let propNightsBooked = 0;
      let propNightsAvailable = 0;

      for (const pr of propReports) {
        propRevenue += Number(pr.grossRevenue);
        propExpenses += Number(pr.totalExpenses);
        propNightsBooked += pr.nightsBooked;
        propNightsAvailable += (pr.nightsAvailable ?? 0);
      }

      totalGrossRevenue += propRevenue;
      totalExpenses += propExpenses;
      totalNightsBooked += propNightsBooked;
      totalNightsAvailable += propNightsAvailable;

      let propOccupancy: number | null = null;
      if (propNightsAvailable > 0) {
        propOccupancy = (propNightsBooked / propNightsAvailable) * 100;
        occupancySum += propOccupancy;
        occupancyCount++;
      }

      breakdown.push({
        propertyId: fp.propertyId,
        propertyName: fp.property.name,
        revenue: propRevenue,
        expenses: propExpenses,
        occupancy: propOccupancy,
      });
    }

    const averageOccupancy = occupancyCount > 0 ? occupancySum / occupancyCount : 0;

    // Compute management fee: (totalGrossRevenue - totalExpenses) * org.managementFee
    const grossProfit = totalGrossRevenue - totalExpenses;
    const managementFee = grossProfit * Number(fund.organization.managementFee);

    res.json({
      success: true,
      data: {
        ...report,
        aggregates: {
          totalGrossRevenue,
          totalExpenses,
          averageOccupancy,
          totalNightsBooked,
          totalNightsAvailable,
          managementFee,
        },
        breakdown,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err) {
    next(err);
  }
});

// POST /:id/reports/:reportId/publish — publish fund report
router.post("/:id/reports/:reportId/publish", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const reportId = uuidParam.parse(req.params.reportId);

    // Verify fund exists and is not soft-deleted
    const fund = await prisma.fund.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!fund) throw new NotFoundError("Fund", id);

    // Find the fund report, verify it's in draft status
    const report = await prisma.fundReport.findFirst({
      where: { id: reportId, fundId: id },
    });
    if (!report) throw new NotFoundError("FundReport", reportId);

    if (report.status !== "draft") {
      throw new ValidationError("Only draft reports can be published");
    }

    // Update status to published
    const updatedReport = await prisma.fundReport.update({
      where: { id: reportId },
      data: {
        status: "published",
        publishedAt: new Date(),
      },
    });

    // Get all active fund investors
    const activeInvestors = await prisma.fundInvestment.findMany({
      where: { fundId: id, status: "active" },
      include: {
        investor: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    // Send fund report notification to investors (fire-and-forget)
    try {
      const investorEmails = activeInvestors.map((inv) => inv.investor.email);
      const quarterLabel = `Q${updatedReport.quarterNumber} ${updatedReport.quarterYear}`;
      await sendFundReportNotification({
        fundName: fund.name,
        quarterLabel,
        investorEmails,
      });
    } catch (err) {
      console.error("[FundReport] Failed to send report notification:", err);
    }

    await logAudit({
      orgId: req.dbUser!.orgId,
      userId: req.dbUser!.id,
      action: "fund.publishReport",
      entityType: "FundReport",
      entityId: reportId,
      metadata: {
        fundId: id,
        investorCount: activeInvestors.length,
      },
    });

    res.json({
      success: true,
      data: updatedReport,
      investors: activeInvestors.map((inv) => ({
        investorId: inv.investorId,
        email: inv.investor.email,
        name: `${inv.investor.firstName} ${inv.investor.lastName}`,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── Fund Distribution Endpoints ─────────────────────────────────────────────

// POST /:id/distributions — admin creates quarterly distributions for all active fund investors
router.post("/:id/distributions", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const data = createFundDistributionSchema.parse(req.body);

    // Verify fund exists and is not soft-deleted
    const fund = await prisma.fund.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
      include: {
        organization: { select: { managementFee: true } },
      },
    });
    if (!fund) throw new NotFoundError("Fund", id);

    // Verify a published fund report exists for the specified quarter
    const publishedReport = await prisma.fundReport.findFirst({
      where: {
        fundId: id,
        quarterYear: data.quarterYear,
        quarterNumber: data.quarterNumber,
        status: "published",
      },
    });
    if (!publishedReport) {
      throw new ValidationError(
        `No published fund report exists for Q${data.quarterNumber} ${data.quarterYear}`
      );
    }

    // Get all active fund investments
    const activeInvestments = await prisma.fundInvestment.findMany({
      where: { fundId: id, status: "active" },
      include: {
        investor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (activeInvestments.length === 0) {
      return res.status(201).json({ success: true, data: [] });
    }

    // Compute total fund investment amount
    const totalFundAmount = activeInvestments.reduce(
      (sum: number, inv: { amount: any }) => sum + Number(inv.amount),
      0
    );

    // Aggregate metrics from published property reports for the quarter (same logic as report detail)
    const fundProperties = await prisma.fundProperty.findMany({
      where: {
        fundId: id,
        removedAt: null,
        property: { deletedAt: null },
      },
    });

    const propertyIds = fundProperties.map((fp: { propertyId: string }) => fp.propertyId);
    const { start: quarterStart, end: quarterEnd } = getQuarterDateRange(
      data.quarterYear,
      data.quarterNumber
    );

    const performanceReports = await prisma.performanceReport.findMany({
      where: {
        propertyId: { in: propertyIds },
        periodStart: { gte: quarterStart },
        periodEnd: { lte: quarterEnd },
        status: "published",
      },
    });

    let totalGrossRevenue = 0;
    let totalExpenses = 0;
    for (const pr of performanceReports) {
      totalGrossRevenue += Number(pr.grossRevenue);
      totalExpenses += Number(pr.totalExpenses);
    }

    // Compute management fee: (totalGrossRevenue - totalExpenses) * org managementFee rate
    const managementFeeRate = Number(fund.organization.managementFee);
    const managementFee = (totalGrossRevenue - totalExpenses) * managementFeeRate;

    // Net profit = totalGrossRevenue - totalExpenses - managementFee
    const netProfit = totalGrossRevenue - totalExpenses - managementFee;

    // Compute quarter period dates for distribution records
    const { start: periodStart, end: periodEnd } = getQuarterDateRange(
      data.quarterYear,
      data.quarterNumber
    );

    // Create distribution records for each active investor
    const distributions = await prisma.$transaction(
      activeInvestments.map((inv: { id: string; amount: any }) => {
        const equityShare = Number(inv.amount) / totalFundAmount;
        const distributionAmount = netProfit * equityShare;

        return prisma.distribution.create({
          data: {
            fundInvestmentId: inv.id,
            distType: "quarterly",
            periodStart,
            periodEnd,
            amount: distributionAmount,
            status: "pending",
          },
        });
      })
    );

    await logAudit({
      orgId: req.dbUser!.orgId,
      userId: req.dbUser!.id,
      action: "fund.createDistributions",
      entityType: "Distribution",
      entityId: id,
      metadata: {
        fundId: id,
        quarterYear: data.quarterYear,
        quarterNumber: data.quarterNumber,
        investorCount: activeInvestments.length,
        netProfit,
      },
    });

    res.status(201).json({ success: true, data: distributions });
  } catch (err) {
    next(err);
  }
});

// GET /:id/distributions — list fund distributions
router.get("/:id/distributions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);

    // Verify fund exists and is not soft-deleted
    const fund = await prisma.fund.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!fund) throw new NotFoundError("Fund", id);

    // Get all distributions linked to fund investments for this fund
    const distributions = await prisma.distribution.findMany({
      where: {
        fundInvestmentId: { not: null },
        fundInvestment: {
          fundId: id,
        },
      },
      include: {
        fundInvestment: {
          include: {
            investor: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
      orderBy: { periodStart: "desc" },
    });

    res.json({ success: true, data: distributions });
  } catch (err) {
    next(err);
  }
});

export default router;
