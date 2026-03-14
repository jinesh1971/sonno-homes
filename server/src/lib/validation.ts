import { z } from "zod";

// Common reusable schemas
export const uuidParam = z.string().uuid("Invalid UUID format");

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Properties
export const createPropertySchema = z.object({
  name: z.string().min(1).max(255),
  propertyType: z.string().min(1).max(100),
  location: z.string().min(1).max(255),
  region: z.string().max(150).optional(),
  bedrooms: z.number().int().min(0).default(0),
  bathrooms: z.number().int().min(0).optional(),
  squareMeters: z.number().min(0).optional(),
  propertyValue: z.number().min(0).optional(),
  acquisitionDate: z.string().date().optional(),
  contractYears: z.number().int().min(1).default(5),
  monthlyYield: z.number().min(0).optional(),
  occupancyRate: z.number().min(0).max(100).optional(),
  noi: z.number().optional(),
  irr: z.number().optional(),
  status: z.enum(["active", "lease_renewal", "inactive", "sold"]).default("active"),
  imageUrl: z.string().url().optional(),
  description: z.string().optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

// Investments
export const createInvestmentSchema = z.object({
  investorId: z.string().uuid(),
  propertyId: z.string().uuid(),
  amount: z.number().min(0),
  equityShare: z.number().min(0).max(100).optional(),
  startDate: z.string().date(),
  endDate: z.string().date().optional(),
  status: z.enum(["active", "matured", "exited", "pending"]).default("active"),
});

export const updateInvestmentSchema = z.object({
  amount: z.number().min(0).optional(),
  equityShare: z.number().min(0).max(100).optional(),
  status: z.enum(["active", "matured", "exited", "pending"]).optional(),
  endDate: z.string().date().optional(),
});

// Users
export const createUserSchema = z.object({
  clerkId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["admin", "investor"]).default("investor"),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(50).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

export const createInvestorSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(50).optional(),
  occupation: z.string().max(150).optional(),
  city: z.string().max(150).optional(),
  country: z.string().max(100).optional(),
  notes: z.string().optional(),
  futureCommitment: z.boolean().optional(),
});

// Investor Profile
export const updateProfileSchema = z.object({
  occupation: z.string().max(150).optional(),
  city: z.string().max(150).optional(),
  country: z.string().max(100).optional(),
  notes: z.string().optional(),
  futureCommitment: z.boolean().optional(),
  accredited: z.boolean().optional(),
});


// Distributions
export const createDistributionSchema = z.object({
  investmentId: z.string().uuid(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  amount: z.number().min(0),
  distType: z.enum(["monthly", "quarterly", "annual", "special"]).default("monthly"),
  notes: z.string().optional(),
});

export const batchDistributionSchema = z.object({
  investmentIds: z.array(z.string().uuid()).min(1),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  amounts: z.record(z.string().uuid(), z.number().min(0)),
  distType: z.enum(["monthly", "quarterly", "annual", "special"]).default("monthly"),
});

export const updateDistributionSchema = z.object({
  amount: z.number().min(0).optional(),
  status: z.enum(["pending", "paid", "failed", "cancelled"]).optional(),
  notes: z.string().optional(),
});


// Performance Reports
export const createReportSchema = z.object({
  propertyId: z.string().uuid(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  nightsBooked: z.number().int().min(0).default(0),
  nightsAvailable: z.number().int().min(0).optional(),
  grossRevenue: z.number().min(0).default(0),
  managementFee: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const updateReportSchema = z.object({
  nightsBooked: z.number().int().min(0).optional(),
  nightsAvailable: z.number().int().min(0).optional(),
  grossRevenue: z.number().min(0).optional(),
  managementFee: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const createExpenseSchema = z.object({
  category: z.string().min(1).max(150),
  description: z.string().optional(),
  amount: z.number().min(0).default(0),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateExpenseSchema = z.object({
  category: z.string().min(1).max(150).optional(),
  description: z.string().optional(),
  amount: z.number().min(0).optional(),
  sortOrder: z.number().int().min(0).optional(),
});
