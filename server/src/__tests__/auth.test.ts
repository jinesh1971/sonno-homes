import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requireRole, requireOrg } from "../middleware/auth.js";

function mockReq(overrides: Partial<Request> = {}): Request {
  return { dbUser: undefined, ...overrides } as unknown as Request;
}

function mockRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("requireRole middleware", () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it("calls next with UnauthorizedError when no dbUser", () => {
    const req = mockReq();
    const res = mockRes();
    requireRole("admin")(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it("calls next with ForbiddenError when role does not match", () => {
    const req = mockReq({
      dbUser: { id: "1", orgId: "org1", clerkId: "c1", email: "a@b.com", role: "investor", firstName: "A", lastName: "B" },
    });
    const res = mockRes();
    requireRole("admin")(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it("calls next() when role matches", () => {
    const req = mockReq({
      dbUser: { id: "1", orgId: "org1", clerkId: "c1", email: "a@b.com", role: "admin", firstName: "A", lastName: "B" },
    });
    const res = mockRes();
    requireRole("admin")(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("allows multiple roles", () => {
    const req = mockReq({
      dbUser: { id: "1", orgId: "org1", clerkId: "c1", email: "a@b.com", role: "investor", firstName: "A", lastName: "B" },
    });
    const res = mockRes();
    requireRole("admin", "investor")(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});

describe("requireOrg middleware", () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it("calls next with UnauthorizedError when no dbUser", () => {
    const req = mockReq();
    const res = mockRes();
    requireOrg(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it("calls next with UnauthorizedError when no orgId", () => {
    const req = mockReq({
      dbUser: { id: "1", orgId: "", clerkId: "c1", email: "a@b.com", role: "admin", firstName: "A", lastName: "B" },
    });
    const res = mockRes();
    requireOrg(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it("calls next() when orgId is present", () => {
    const req = mockReq({
      dbUser: { id: "1", orgId: "org-123", clerkId: "c1", email: "a@b.com", role: "admin", firstName: "A", lastName: "B" },
    });
    const res = mockRes();
    requireOrg(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
