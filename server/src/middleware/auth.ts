import type { Request, Response, NextFunction } from "express";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { UnauthorizedError, ForbiddenError } from "../lib/errors.js";
import prisma from "../lib/prisma.js";
import type { UserRole } from "@prisma/client";

// Extend Express Request to carry our DB user
declare global {
  namespace Express {
    interface Request {
      dbUser?: {
        id: string;
        orgId: string;
        clerkId: string;
        email: string;
        role: UserRole;
        firstName: string;
        lastName: string;
      };
    }
  }
}

/**
 * Clerk session verification middleware.
 * Attaches Clerk auth info to the request.
 */
export const clerkAuth = clerkMiddleware();

/**
 * Resolves the Clerk user to our DB user record.
 * Must be used after clerkAuth.
 * In dev mode with DEV_BYPASS_AUTH, uses X-Dev-Role header (admin|investor) to pick a seeded user.
 */
export async function resolveUser(req: Request, _res: Response, next: NextFunction) {
  try {
    // Dev bypass: skip Clerk, load user directly from DB
    if (process.env.DEV_BYPASS_AUTH === "true") {
      const role = (req.headers["x-dev-role"] as string) || "admin";
      const user = await prisma.user.findFirst({
        where: { role: role as UserRole, deletedAt: null },
        select: { id: true, orgId: true, clerkId: true, email: true, role: true, firstName: true, lastName: true },
      });
      if (!user) throw new UnauthorizedError("No seeded user found for role: " + role);
      req.dbUser = user;
      return next();
    }

    const auth = getAuth(req);
    if (!auth?.userId) {
      throw new UnauthorizedError();
    }

    const user = await prisma.user.findFirst({
      where: { clerkId: auth.userId, deletedAt: null },
      select: {
        id: true,
        orgId: true,
        clerkId: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError("User not found in system");
    }

    req.dbUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Requires the user to have one of the specified roles.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return next(new UnauthorizedError());
    }
    if (!roles.includes(req.dbUser.role)) {
      return next(new ForbiddenError());
    }
    next();
  };
}

/**
 * Scopes all downstream queries to the user's organization.
 * Attaches orgId to req for easy access.
 */
export function requireOrg(req: Request, _res: Response, next: NextFunction) {
  if (!req.dbUser?.orgId) {
    return next(new UnauthorizedError("Organization context required"));
  }
  next();
}
