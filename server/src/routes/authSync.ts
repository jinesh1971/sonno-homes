import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// POST /api/v1/auth/sync — Sync Clerk user with our database
// Called from frontend after Clerk sign-in to create/find user and return role
router.post("/", async (req: Request, res: Response) => {
  try {
    const { clerkId, email, firstName, lastName, phone } = req.body;

    if (!clerkId || !email) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "clerkId and email are required" },
      });
    }

    // Find existing user by clerkId
    let user = await prisma.user.findUnique({ where: { clerkId } });

    if (user) {
      // If user was soft-deleted by admin, reject the sync
      if (user.deletedAt) {
        return res.status(403).json({
          success: false,
          error: { code: "USER_DELETED", message: "Your account has been removed. Please contact an administrator." },
          deleted: true,
        });
      }
      // User exists — update name/phone if they were empty (e.g., first sync didn't have them)
      const updates: any = {};
      if ((!user.firstName || !user.lastName) && (firstName || lastName)) {
        if (firstName) updates.firstName = firstName;
        if (lastName) updates.lastName = lastName;
      }
      if (!user.phone && phone) updates.phone = phone;
      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({ where: { id: user.id }, data: updates });
      }
      return res.json({ success: true, data: { id: user.id, role: user.role, email: user.email } });
    }

    // Check if user exists by email (might have been pre-created by admin)
    user = await prisma.user.findFirst({ where: { email, deletedAt: null } });

    if (user) {
      // Link Clerk ID to existing user + update name if missing
      const updateData: any = { clerkId };
      if (!user.firstName && firstName) updateData.firstName = firstName;
      if (!user.lastName && lastName) updateData.lastName = lastName;
      if (!user.phone && phone) updateData.phone = phone;
      user = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
      return res.json({ success: true, data: { id: user.id, role: user.role, email: user.email } });
    }

    // Check if user was previously deleted by admin — don't re-create them
    const deletedUser = await prisma.user.findFirst({ where: { email, deletedAt: { not: null } } });
    if (deletedUser) {
      return res.status(403).json({
        success: false,
        error: { code: "USER_DELETED", message: "Your account has been removed. Please contact an administrator." },
        deleted: true,
      });
    }

    // New user — get the default org
    const org = await prisma.organization.findFirst();
    if (!org) {
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: "No organization found" },
      });
    }

    // Create as lead
    user = await prisma.user.create({
      data: {
        orgId: org.id,
        clerkId,
        email,
        firstName: firstName || "",
        lastName: lastName || "",
        phone: phone || null,
        role: "lead",
      },
    });

    return res.json({ success: true, data: { id: user.id, role: user.role, email: user.email } });
  } catch (error: any) {
    console.error("Auth sync error:", error);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to sync user" },
    });
  }
});

export default router;
