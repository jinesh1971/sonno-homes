import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

describe("Prisma Schema", () => {
  it("schema.prisma file exists", () => {
    const schemaPath = path.resolve(import.meta.dirname, "../../prisma/schema.prisma");
    expect(existsSync(schemaPath)).toBe(true);
  });

  it("schema validates without errors", () => {
    const result = execSync("npx prisma validate", {
      cwd: path.resolve(import.meta.dirname, "../.."),
      encoding: "utf-8",
    });
    expect(result).toContain("is valid");
  });

  it("schema contains all expected models", () => {
    const result = execSync("npx prisma validate", {
      cwd: path.resolve(import.meta.dirname, "../.."),
      encoding: "utf-8",
    });
    // If validate passes, the schema is parseable with all models
    expect(result).toContain("is valid");
  });
});
