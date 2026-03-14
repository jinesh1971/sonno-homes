import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { errorHandler } from "../middleware/errorHandler.js";
import { AppError, NotFoundError, ForbiddenError, ValidationError } from "../lib/errors.js";
import { ZodError, ZodIssueCode } from "zod";

function mockRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const req = {} as Request;
const next = vi.fn() as NextFunction;

describe("errorHandler", () => {
  it("handles AppError with correct status and format", () => {
    const res = mockRes();
    const err = new AppError(422, "CUSTOM", "Something went wrong");
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: "CUSTOM", message: "Something went wrong" },
    });
  });

  it("handles NotFoundError", () => {
    const res = mockRes();
    errorHandler(new NotFoundError("Property", "abc"), req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("handles ForbiddenError", () => {
    const res = mockRes();
    errorHandler(new ForbiddenError(), req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("handles ValidationError with details", () => {
    const res = mockRes();
    errorHandler(new ValidationError("Bad input", { field: "email" }), req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ details: { field: "email" } }),
      })
    );
  });

  it("handles ZodError with field-level details", () => {
    const res = mockRes();
    const zodErr = new ZodError([
      { code: ZodIssueCode.invalid_type, expected: "string", received: "number", path: ["email"], message: "Expected string" },
    ]);
    errorHandler(zodErr, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "VALIDATION_ERROR",
          details: [{ field: "email", message: "Expected string" }],
        }),
      })
    );
  });

  it("handles unknown errors as 500", () => {
    const res = mockRes();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    errorHandler(new Error("oops"), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    });
    spy.mockRestore();
  });
});
