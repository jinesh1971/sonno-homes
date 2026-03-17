import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { resolveUser, requireRole, requireOrg } from "../middleware/auth.js";
import {
  createOfferingSchema,
  updateOfferingSchema,
  createLOISchema,
  updateLOISchema,
  uuidParam,
} from "../lib/validation.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import { sendLOINotification } from "../lib/emailService.js";

const router = Router();

// All offering routes require auth + org
router.use(resolveUser, requireOrg);

// POST /offerings — admin creates offering, defaults status to draft
router.post("/", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createOfferingSchema.parse(req.body);
    const offering = await prisma.offering.create({
      data: {
        ...data,
        orgId: req.dbUser!.orgId,
        status: "draft",
      },
    });
    res.status(201).json({ success: true, data: offering });
  } catch (err) {
    next(err);
  }
});

// GET /offerings — investors see only open, admins see all
// Supports ?type=fund|property|all to filter by product type
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = { orgId: req.dbUser!.orgId };

    if (req.dbUser!.role === "investor" || req.dbUser!.role === "lead") {
      where.status = "open";
    }

    // Filter by product type
    const typeFilter = req.query.type as string | undefined;
    if (typeFilter === "fund") {
      where.fundId = { not: null };
    } else if (typeFilter === "property") {
      where.fundId = null;
    }
    // "all" or no param → no additional filter

    const offerings = await prisma.offering.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { property: true, fund: true },
    });

    const data = offerings.map((o) => ({
      ...o,
      productType: o.fundId ? "fund" : "property",
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /offerings/:id — get offering detail with property and fund info
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const offering = await prisma.offering.findFirst({
      where: { id, orgId: req.dbUser!.orgId },
      include: { property: true, fund: true },
    });
    if (!offering) throw new NotFoundError("Offering", id);

    // Investors and leads can only see open offerings
    if ((req.dbUser!.role === "investor" || req.dbUser!.role === "lead") && offering.status !== "open") {
      throw new NotFoundError("Offering", id);
    }

    const data = {
      ...offering,
      productType: offering.fundId ? "fund" : "property",
    };

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// PATCH /offerings/:id — update offering fields/status with transition validation
router.patch("/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const data = updateOfferingSchema.parse(req.body);

    const existing = await prisma.offering.findFirst({
      where: { id, orgId: req.dbUser!.orgId },
    });
    if (!existing) throw new NotFoundError("Offering", id);

    // Block funded → open transition
    if (existing.status === "funded" && data.status === "open") {
      throw new ValidationError("Funded offerings cannot be reopened");
    }

    const offering = await prisma.offering.update({
      where: { id },
      data,
    });

    res.json({ success: true, data: offering });
  } catch (err) {
    next(err);
  }
});

// POST /offerings/:id/lois — investor or lead submits LOI
router.post("/:id/lois", requireRole("investor", "lead"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offeringId = uuidParam.parse(req.params.id);
    const data = createLOISchema.parse(req.body);

    const offering = await prisma.offering.findFirst({
      where: { id: offeringId, orgId: req.dbUser!.orgId },
      include: { fund: true },
    });
    if (!offering) throw new NotFoundError("Offering", offeringId);

    if (offering.status !== "open") {
      throw new ValidationError("This offering is not currently accepting investments");
    }

    if (data.intendedAmount < Number(offering.minimumInvestment)) {
      throw new ValidationError(
        `Intended amount must be at least ${offering.minimumInvestment}`
      );
    }

    // For fund offerings, also validate against the fund's minimum investment
    if (offering.fund && offering.fund.minimumInvestment !== null) {
      const fundMin = Number(offering.fund.minimumInvestment);
      if (data.intendedAmount < fundMin) {
        throw new ValidationError(
          `Intended amount must be at least ${offering.fund.minimumInvestment}`
        );
      }
    }

    const loi = await prisma.letterOfIntent.create({
      data: {
        offeringId,
        investorId: req.dbUser!.id,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        intendedAmount: data.intendedAmount,
        occupation: data.occupation || null,
        city: data.city || null,
        signatureAcknowledged: data.signatureAcknowledged,
        status: "submitted",
      },
    });

    // Send email notification to admins (non-blocking)
    try {
      const admins = await prisma.user.findMany({
        where: { orgId: req.dbUser!.orgId, role: "admin" },
        select: { email: true },
      });
      const adminEmails = admins.map(a => a.email).filter(Boolean);
      if (adminEmails.length > 0) {
        await sendLOINotification({
          investorName: data.fullName,
          offeringTitle: offering.title,
          intendedAmount: data.intendedAmount,
          submittedAt: loi.submittedAt,
          adminEmails,
        });
      }
    } catch (emailErr) {
      console.error("[LOI] Failed to send notification email:", emailErr);
    }

    res.status(201).json({ success: true, data: loi });
  } catch (err) {
    next(err);
  }
});

// GET /offerings/:id/lois — admin lists LOIs ordered by submittedAt desc
router.get("/:id/lois", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offeringId = uuidParam.parse(req.params.id);

    const offering = await prisma.offering.findFirst({
      where: { id: offeringId, orgId: req.dbUser!.orgId },
    });
    if (!offering) throw new NotFoundError("Offering", offeringId);

    const lois = await prisma.letterOfIntent.findMany({
      where: { offeringId },
      orderBy: { submittedAt: "desc" },
    });

    res.json({ success: true, data: lois });
  } catch (err) {
    next(err);
  }
});

// PATCH /offerings/:id/lois/:loiId — admin updates LOI status with pipeline logic
router.patch("/:id/lois/:loiId", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offeringId = uuidParam.parse(req.params.id);
    const loiId = uuidParam.parse(req.params.loiId);
    const data = updateLOISchema.parse(req.body);

    const offering = await prisma.offering.findFirst({
      where: { id: offeringId, orgId: req.dbUser!.orgId },
      include: { fund: true },
    });
    if (!offering) throw new NotFoundError("Offering", offeringId);

    const existing = await prisma.letterOfIntent.findFirst({
      where: { id: loiId, offeringId },
    });
    if (!existing) throw new NotFoundError("LetterOfIntent", loiId);

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      submitted: ["reviewed", "rejected", "withdrawn"],
      reviewed: ["approved", "rejected", "withdrawn"],
      approved: ["funded", "rejected", "withdrawn"],
      funded: [], // terminal state
      rejected: [], // terminal state
      withdrawn: [], // terminal state
    };
    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(data.status)) {
      throw new ValidationError(`Cannot transition LOI from "${existing.status}" to "${data.status}"`);
    }

    const updateData: any = { status: data.status };
    if (data.status === "reviewed") {
      updateData.reviewedAt = new Date();
    }

    // When marking as "funded": create investment + auto-promote lead → investor
    if (data.status === "funded") {
      updateData.fundedAt = new Date();

      const investor = await prisma.user.findUnique({ where: { id: existing.investorId } });
      if (!investor) throw new NotFoundError("User", existing.investorId);

      // Update investor name if missing (from LOI fullName)
      if ((!investor.firstName || !investor.lastName) && existing.fullName) {
        const parts = existing.fullName.trim().split(/\s+/);
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ") || "";
        if (firstName || lastName) {
          await prisma.user.update({
            where: { id: investor.id },
            data: {
              ...((!investor.firstName && firstName) ? { firstName } : {}),
              ...((!investor.lastName && lastName) ? { lastName } : {}),
            },
          });
        }
      }

      // Create the investment record (skip if already exists)
      if (offering.fundId) {
        // Fund offering → create fund investment
        const existingFundInv = await prisma.fundInvestment.findFirst({
          where: { fundId: offering.fundId, investorId: investor.id, deletedAt: null },
        });
        if (!existingFundInv) {
          await prisma.fundInvestment.create({
            data: {
              fundId: offering.fundId,
              investorId: investor.id,
              amount: existing.intendedAmount,
              startDate: new Date(),
              status: "active",
            },
          });
        }
      } else if (offering.propertyId) {
        // Property offering → create property investment
        const existingPropInv = await prisma.investment.findFirst({
          where: { investorId: investor.id, propertyId: offering.propertyId, deletedAt: null },
        });
        if (!existingPropInv) {
          await prisma.investment.create({
            data: {
              investorId: investor.id,
              propertyId: offering.propertyId,
              amount: existing.intendedAmount,
              startDate: new Date(),
              status: "active",
            },
          });
        }
      }

      // Auto-promote lead → investor (only if currently a lead)
      if (investor.role === "lead") {
        await prisma.user.update({
          where: { id: investor.id },
          data: { role: "investor" },
        });

        // Create investor profile if it doesn't exist
        const existingProfile = await prisma.investorProfile.findUnique({
          where: { userId: investor.id },
        });
        if (!existingProfile) {
          await prisma.investorProfile.create({
            data: {
              userId: investor.id,
              occupation: existing.occupation || undefined,
              city: existing.city || undefined,
            },
          });
        }
      }
    }

    const loi = await prisma.letterOfIntent.update({
      where: { id: loiId },
      data: updateData,
    });

    res.json({ success: true, data: loi });
  } catch (err) {
    next(err);
  }
});

export default router;
