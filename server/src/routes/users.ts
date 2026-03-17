import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { resolveUser, requireRole, requireOrg } from "../middleware/auth.js";
import { updateUserSchema, createInvestorSchema, updateProfileSchema, uuidParam, paginationQuery } from "../lib/validation.js";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";

const router = Router();
router.use(resolveUser, requireOrg);

// GET /users (admin only)
router.get("/", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = paginationQuery.parse(req.query);
    const skip = (page - 1) * limit;
    const orgId = req.dbUser!.orgId;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { orgId, deletedAt: null },
        skip, take: limit,
        include: { investorProfile: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where: { orgId, deletedAt: null } }),
    ]);

    res.json({ success: true, data: { users, total, page, limit } });
  } catch (err) { next(err); }
});

// POST /users (admin only — create investor)
router.post("/", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createInvestorSchema.parse(req.body);
    const orgId = req.dbUser!.orgId;

    const user = await prisma.user.create({
      data: {
        orgId,
        clerkId: `manual_${Date.now()}`,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        role: "investor",
        investorProfile: {
          create: {
            occupation: data.occupation || null,
            city: data.city || null,
            country: data.country || null,
            notes: data.notes || null,
            futureCommitment: data.futureCommitment ?? false,
          },
        },
      },
      include: { investorProfile: true },
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
});

// GET /users/:id (admin only)
router.get("/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const user = await prisma.user.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
      include: { investorProfile: true },
    });
    if (!user) throw new NotFoundError("User", id);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// PATCH /users/:id (admin only)
router.patch("/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const data = updateUserSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError("User", id);

    const user = await prisma.user.update({ where: { id }, data });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// DELETE /users/:id (admin only, hard delete — removes all related data)
router.delete("/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const existing = await prisma.user.findFirst({
      where: { id, orgId: req.dbUser!.orgId },
    });
    if (!existing) throw new NotFoundError("User", id);

    // Prevent deleting yourself
    if (id === req.dbUser!.id) {
      throw new ForbiddenError("Cannot delete your own account");
    }

    // Delete all related data in order (respecting FK constraints)
    await prisma.documentRecipient.deleteMany({ where: { investorId: id } });
    await prisma.distribution.deleteMany({ where: { investment: { investorId: id } } });
    await prisma.distribution.deleteMany({ where: { fundInvestment: { investorId: id } } });
    await prisma.investment.deleteMany({ where: { investorId: id } });
    await prisma.fundInvestment.deleteMany({ where: { investorId: id } });
    await prisma.letterOfIntent.deleteMany({ where: { investorId: id } });
    await prisma.investorProfile.deleteMany({ where: { userId: id } });
    await prisma.auditLog.deleteMany({ where: { userId: id } });
    await prisma.document.deleteMany({ where: { uploadedBy: id } });
    await prisma.user.delete({ where: { id } });

    res.json({ success: true, data: { message: "Investor and all related data permanently deleted" } });
  } catch (err) { next(err); }
});

// POST /users/:id/promote (admin only — promote lead to investor)
router.post("/:id/promote", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const existing = await prisma.user.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError("User", id);

    const user = await prisma.user.update({
      where: { id },
      data: { role: "investor" },
      include: { investorProfile: true },
    });

    // Create investor profile if it doesn't exist
    if (!user.investorProfile) {
      await prisma.investorProfile.create({
        data: { userId: user.id },
      });
    }

    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// GET /users/:id/profile
router.get("/:id/profile", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);

    // Investors can only view their own profile
    if (req.dbUser!.role === "investor" && req.dbUser!.id !== id) {
      throw new ForbiddenError();
    }

    const profile = await prisma.investorProfile.findFirst({
      where: { userId: id, user: { orgId: req.dbUser!.orgId, deletedAt: null } },
    });
    if (!profile) throw new NotFoundError("Investor profile", id);
    res.json({ success: true, data: profile });
  } catch (err) { next(err); }
});

// PATCH /users/:id/profile
router.patch("/:id/profile", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const data = updateProfileSchema.parse(req.body);

    // Investors can only update their own profile
    if (req.dbUser!.role === "investor" && req.dbUser!.id !== id) {
      throw new ForbiddenError();
    }

    const profile = await prisma.investorProfile.findFirst({
      where: { userId: id, user: { orgId: req.dbUser!.orgId } },
    });

    if (!profile) {
      // Create profile if it doesn't exist
      const newProfile = await prisma.investorProfile.create({
        data: { userId: id, ...data },
      });
      res.status(201).json({ success: true, data: newProfile });
      return;
    }

    const updated = await prisma.investorProfile.update({
      where: { id: profile.id },
      data,
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

export default router;
