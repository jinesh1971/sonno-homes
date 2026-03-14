import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { resolveUser, requireRole, requireOrg } from "../middleware/auth.js";
import { uuidParam } from "../lib/validation.js";

const router = Router();
router.use(resolveUser, requireOrg);

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) lines.push(row.map(escape).join(","));
  return lines.join("\n");
}

function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

// GET /exports/investors (admin only)
router.get("/investors", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { orgId: req.dbUser!.orgId, role: "investor", deletedAt: null },
      include: { investorProfile: true, investments: { where: { deletedAt: null }, select: { amount: true } } },
      orderBy: { lastName: "asc" },
    });

    const headers = ["Name", "Email", "Phone", "City", "Country", "Total Invested", "Properties", "Active"];
    const rows = users.map((u: any) => [
      `${u.firstName} ${u.lastName}`, u.email, u.phone || "",
      u.investorProfile?.city || "", u.investorProfile?.country || "",
      String(u.investments.reduce((s: number, i: any) => s + Number(i.amount), 0)),
      String(u.investments.length), u.isActive ? "Yes" : "No",
    ]);

    sendCsv(res, "investors.csv", toCsv(headers, rows));
  } catch (err) { next(err); }
});

// GET /exports/properties (admin only)
router.get("/properties", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const properties = await prisma.property.findMany({
      where: { orgId: req.dbUser!.orgId, deletedAt: null },
      include: { investments: { where: { deletedAt: null }, select: { amount: true } } },
      orderBy: { name: "asc" },
    });

    const headers = ["Name", "Type", "Location", "Region", "Value", "Status", "Bedrooms", "Total Invested", "Investors"];
    const rows = properties.map((p: any) => [
      p.name, p.propertyType, p.location, p.region || "",
      String(Number(p.propertyValue || 0)), p.status, String(p.bedrooms),
      String(p.investments.reduce((s: number, i: any) => s + Number(i.amount), 0)),
      String(p.investments.length),
    ]);

    sendCsv(res, "properties.csv", toCsv(headers, rows));
  } catch (err) { next(err); }
});

// GET /exports/distributions (admin only)
router.get("/distributions", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dists = await prisma.distribution.findMany({
      where: { investment: { property: { orgId: req.dbUser!.orgId } } },
      include: {
        investment: {
          include: {
            investor: { select: { firstName: true, lastName: true, email: true } },
            property: { select: { name: true } },
          },
        },
      },
      orderBy: { periodStart: "desc" },
    });

    const headers = ["Investor", "Email", "Property", "Period Start", "Period End", "Amount", "Type", "Status", "Paid At"];
    const rows = dists.map((d: any) => [
      `${d.investment.investor.firstName} ${d.investment.investor.lastName}`,
      d.investment.investor.email, d.investment.property.name,
      d.periodStart.toISOString().slice(0, 10), d.periodEnd.toISOString().slice(0, 10),
      String(Number(d.amount)), d.distType, d.status, d.paidAt ? d.paidAt.toISOString().slice(0, 10) : "",
    ]);

    sendCsv(res, "distributions.csv", toCsv(headers, rows));
  } catch (err) { next(err); }
});

// GET /exports/reports/:id (admin only — single report CSV)
router.get("/reports/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const report = await prisma.performanceReport.findFirst({
      where: { id, deletedAt: null, property: { orgId: req.dbUser!.orgId } },
      include: { property: true, expenses: { orderBy: { sortOrder: "asc" } } },
    });
    if (!report) { res.status(404).json({ success: false, error: { message: "Report not found" } }); return; }

    const grossProfit = Number(report.grossRevenue) - Number(report.totalExpenses);
    const netProfit = grossProfit - Number(report.managementFee);

    const headers = ["Field", "Value"];
    const rows: string[][] = [
      ["Property", report.property.name],
      ["Period", `${report.periodStart.toISOString().slice(0, 10)} to ${report.periodEnd.toISOString().slice(0, 10)}`],
      ["Nights Booked", String(report.nightsBooked)],
      ["Gross Revenue", String(Number(report.grossRevenue))],
      ["Total Expenses", String(Number(report.totalExpenses))],
      ["Gross Profit", String(grossProfit)],
      ["Management Fee", String(Number(report.managementFee))],
      ["Net Profit", String(netProfit)],
      ["", ""],
      ["Expense Breakdown", ""],
    ];
    for (const e of report.expenses) {
      rows.push([e.category, String(Number(e.amount))]);
    }

    sendCsv(res, `report-${report.property.name.replace(/\s+/g, "-")}-${report.periodStart.toISOString().slice(0, 7)}.csv`, toCsv(headers, rows));
  } catch (err) { next(err); }
});

// GET /exports/my-distributions (investor — own distributions)
router.get("/my-distributions", requireRole("investor"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dists = await prisma.distribution.findMany({
      where: { investment: { investorId: req.dbUser!.id, deletedAt: null } },
      include: { investment: { include: { property: { select: { name: true } } } } },
      orderBy: { periodStart: "desc" },
    });

    const headers = ["Property", "Period Start", "Period End", "Amount", "Type", "Status", "Paid At"];
    const rows = dists.map((d: any) => [
      d.investment.property.name,
      d.periodStart.toISOString().slice(0, 10), d.periodEnd.toISOString().slice(0, 10),
      String(Number(d.amount)), d.distType, d.status, d.paidAt ? d.paidAt.toISOString().slice(0, 10) : "",
    ]);

    sendCsv(res, "my-distributions.csv", toCsv(headers, rows));
  } catch (err) { next(err); }
});

export default router;
