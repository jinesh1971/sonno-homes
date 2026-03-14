import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { resolveUser, requireRole, requireOrg } from "../middleware/auth.js";
import {
  createReportSchema, updateReportSchema,
  createExpenseSchema, updateExpenseSchema,
  uuidParam, paginationQuery,
} from "../lib/validation.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";
const router = Router();
router.use(resolveUser, requireOrg);

// Helper: recalculate total_expenses on a report
async function recalcExpenses(reportId: string) {
  const expenses = await prisma.reportExpense.findMany({ where: { reportId } });
  const total = expenses.reduce((sum: number, e: { amount: unknown }) => sum + Number(e.amount), 0);
  await prisma.performanceReport.update({
    where: { id: reportId },
    data: { totalExpenses: total },
  });
  return total;
}

// GET /reports
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = paginationQuery.parse(req.query);
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (req.dbUser!.role === "investor") {
      where.status = "published";
      where.property = {
        investments: { some: { investorId: req.dbUser!.id, deletedAt: null } },
      };
    } else {
      where.property = { orgId: req.dbUser!.orgId };
    }

    const [reports, total] = await Promise.all([
      prisma.performanceReport.findMany({
        where, skip, take: limit,
        include: {
          property: { select: { id: true, name: true, location: true } },
          expenses: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { periodStart: "desc" },
      }),
      prisma.performanceReport.count({ where }),
    ]);

    // Compute grossProfit and netProfit for each report
    const data = reports.map((r: any) => ({
      ...r,
      grossProfit: Number(r.grossRevenue) - Number(r.totalExpenses),
      netProfit: Number(r.grossRevenue) - Number(r.totalExpenses) - Number(r.managementFee),
    }));

    res.json({ success: true, data: { reports: data, total, page, limit } });
  } catch (err) { next(err); }
});

// GET /reports/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const where: any = { id, deletedAt: null };
    if (req.dbUser!.role === "investor") {
      where.status = "published";
    }

    const report = await prisma.performanceReport.findFirst({
      where,
      include: {
        property: { select: { id: true, name: true, location: true } },
        expenses: { orderBy: { sortOrder: "asc" } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!report) throw new NotFoundError("Report", id);

    res.json({
      success: true,
      data: {
        ...report,
        grossProfit: Number(report.grossRevenue) - Number(report.totalExpenses),
        netProfit: Number(report.grossRevenue) - Number(report.totalExpenses) - Number(report.managementFee),
      },
    });
  } catch (err) { next(err); }
});

// POST /reports (admin only)
router.post("/", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createReportSchema.parse(req.body);

    if (new Date(data.periodEnd) <= new Date(data.periodStart)) {
      throw new ValidationError("periodEnd must be after periodStart");
    }

    const property = await prisma.property.findFirst({
      where: { id: data.propertyId, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!property) throw new NotFoundError("Property", data.propertyId);

    // Auto-calculate management fee if not provided
    const grossProfit = data.grossRevenue; // no expenses yet at creation
    const org = await prisma.organization.findFirst({ where: { id: req.dbUser!.orgId } });
    const feeRate = org ? Number(org.managementFee) : 0.20;
    const mgmtFee = data.managementFee ?? grossProfit * feeRate;

    const report = await prisma.performanceReport.create({
      data: {
        propertyId: data.propertyId,
        createdBy: req.dbUser!.id,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        nightsBooked: data.nightsBooked,
        nightsAvailable: data.nightsAvailable,
        grossRevenue: data.grossRevenue,
        managementFee: mgmtFee,
        notes: data.notes,
      },
    });
    res.status(201).json({ success: true, data: report });
  } catch (err) { next(err); }
});

// PATCH /reports/:id (admin only, draft only)
router.patch("/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const data = updateReportSchema.parse(req.body);

    const existing = await prisma.performanceReport.findFirst({
      where: { id, deletedAt: null, property: { orgId: req.dbUser!.orgId } },
    });
    if (!existing) throw new NotFoundError("Report", id);
    if (existing.status !== "draft") throw new ValidationError("Only draft reports can be edited");

    const report = await prisma.performanceReport.update({ where: { id }, data });
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

// POST /reports/:id/publish (admin only)
router.post("/:id/publish", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);

    const report = await prisma.performanceReport.findFirst({
      where: { id, deletedAt: null, property: { orgId: req.dbUser!.orgId } },
      include: { expenses: true, property: true },
    });
    if (!report) throw new NotFoundError("Report", id);
    if (report.status !== "draft") throw new ValidationError("Only draft reports can be published");
    if (report.expenses.length === 0) throw new ValidationError("Report must have at least one expense line item");
    if (Number(report.grossRevenue) === 0) throw new ValidationError("Report must have gross revenue greater than zero");

    // Recalc management fee based on actual gross profit
    const grossProfit = Number(report.grossRevenue) - Number(report.totalExpenses);
    const org = await prisma.organization.findFirst({ where: { id: req.dbUser!.orgId } });
    const feeRate = org ? Number(org.managementFee) : 0.20;
    const mgmtFee = grossProfit * feeRate;

    // Publish report
    const published = await prisma.performanceReport.update({
      where: { id },
      data: { status: "published", publishedAt: new Date(), managementFee: mgmtFee },
    });

    // Auto-create document record
    const doc = await prisma.document.create({
      data: {
        orgId: req.dbUser!.orgId,
        uploadedBy: req.dbUser!.id,
        propertyId: report.propertyId,
        reportId: id,
        title: `Performance Report — ${report.property.name} — ${report.periodStart.toISOString().slice(0, 7)}`,
        docType: "performance_report",
        fileUrl: `reports/${id}.pdf`, // placeholder — actual PDF generation later
      },
    });

    // Share with all investors linked to this property
    const investments = await prisma.investment.findMany({
      where: { propertyId: report.propertyId, deletedAt: null, status: "active" },
      select: { investorId: true },
    });

    if (investments.length > 0) {
      await prisma.documentRecipient.createMany({
        data: investments.map((inv: { investorId: string }) => ({
          documentId: doc.id,
          investorId: inv.investorId,
        })),
        skipDuplicates: true,
      });
    }

    res.json({
      success: true,
      data: {
        report: { ...published, grossProfit, netProfit: grossProfit - mgmtFee },
        document: doc,
        sharedWith: investments.length,
      },
    });
  } catch (err) { next(err); }
});

// DELETE /reports/:id (admin only, draft only)
router.delete("/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const existing = await prisma.performanceReport.findFirst({
      where: { id, deletedAt: null, property: { orgId: req.dbUser!.orgId } },
    });
    if (!existing) throw new NotFoundError("Report", id);
    if (existing.status === "published") throw new ValidationError("Published reports cannot be deleted");

    await prisma.performanceReport.update({ where: { id }, data: { deletedAt: new Date() } });
    res.json({ success: true, data: { message: "Report deleted" } });
  } catch (err) { next(err); }
});

// ── EXPENSE LINE ITEMS ──────────────────────────────────────────────────────

// GET /reports/:id/expenses
router.get("/:id/expenses", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportId = uuidParam.parse(req.params.id);
    const expenses = await prisma.reportExpense.findMany({
      where: { reportId },
      orderBy: { sortOrder: "asc" },
    });
    res.json({ success: true, data: expenses });
  } catch (err) { next(err); }
});

// POST /reports/:id/expenses (admin only)
router.post("/:id/expenses", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportId = uuidParam.parse(req.params.id);
    const data = createExpenseSchema.parse(req.body);

    const report = await prisma.performanceReport.findFirst({
      where: { id: reportId, deletedAt: null, property: { orgId: req.dbUser!.orgId } },
    });
    if (!report) throw new NotFoundError("Report", reportId);
    if (report.status !== "draft") throw new ValidationError("Cannot add expenses to a published report");

    const expense = await prisma.reportExpense.create({
      data: { reportId, ...data },
    });

    await recalcExpenses(reportId);
    res.status(201).json({ success: true, data: expense });
  } catch (err) { next(err); }
});

// PATCH /reports/:id/expenses/:expenseId (admin only)
router.patch("/:id/expenses/:expenseId", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportId = uuidParam.parse(req.params.id);
    const expenseId = uuidParam.parse(req.params.expenseId);
    const data = updateExpenseSchema.parse(req.body);

    const expense = await prisma.reportExpense.findFirst({
      where: { id: expenseId, reportId },
    });
    if (!expense) throw new NotFoundError("Expense", expenseId);

    const updated = await prisma.reportExpense.update({ where: { id: expenseId }, data });
    await recalcExpenses(reportId);
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// DELETE /reports/:id/expenses/:expenseId (admin only)
router.delete("/:id/expenses/:expenseId", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportId = uuidParam.parse(req.params.id);
    const expenseId = uuidParam.parse(req.params.expenseId);

    const expense = await prisma.reportExpense.findFirst({
      where: { id: expenseId, reportId },
    });
    if (!expense) throw new NotFoundError("Expense", expenseId);

    await prisma.reportExpense.delete({ where: { id: expenseId } });
    await recalcExpenses(reportId);
    res.json({ success: true, data: { message: "Expense deleted" } });
  } catch (err) { next(err); }
});

export default router;
