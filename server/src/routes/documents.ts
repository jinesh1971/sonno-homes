import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { resolveUser, requireRole, requireOrg } from "../middleware/auth.js";
import { uuidParam, paginationQuery } from "../lib/validation.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import { z } from "zod";

const router = Router();
router.use(resolveUser, requireOrg);

// Validation schemas
const createDocumentSchema = z.object({
  propertyId: z.string().uuid().optional(),
  reportId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  docType: z.enum(["contract", "tax_k1", "operating_agreement", "statement", "performance_report", "schedule", "policy", "other"]).default("other"),
  fileUrl: z.string().min(1),
  fileSizeBytes: z.number().int().min(0).optional(),
  mimeType: z.string().max(100).optional(),
  description: z.string().optional(),
});

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  docType: z.enum(["contract", "tax_k1", "operating_agreement", "statement", "performance_report", "schedule", "policy", "other"]).optional(),
});

const shareDocumentSchema = z.object({
  investorIds: z.array(z.string().uuid()).min(1),
});

// GET /documents — list documents (admin sees all org docs, investor sees shared docs)
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = paginationQuery.parse(req.query);
    const skip = (page - 1) * limit;

    let where: any = { deletedAt: null };
    if (req.dbUser!.role === "investor") {
      where.recipients = { some: { investorId: req.dbUser!.id } };
    } else {
      where.orgId = req.dbUser!.orgId;
    }

    // Optional filters
    if (req.query.propertyId) where.propertyId = uuidParam.parse(req.query.propertyId);
    if (req.query.docType) where.docType = req.query.docType;

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where, skip, take: limit,
        include: {
          property: { select: { id: true, name: true } },
          uploader: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { recipients: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.document.count({ where }),
    ]);

    res.json({ success: true, data: { documents, total, page, limit } });
  } catch (err) { next(err); }
});

// GET /documents/:id — document detail
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    let where: any = { id, deletedAt: null };
    if (req.dbUser!.role === "investor") {
      where.recipients = { some: { investorId: req.dbUser!.id } };
    }

    const doc = await prisma.document.findFirst({
      where,
      include: {
        property: { select: { id: true, name: true } },
        uploader: { select: { id: true, firstName: true, lastName: true } },
        recipients: {
          include: { investor: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
    });
    if (!doc) throw new NotFoundError("Document", id);

    // Auto-mark as viewed for investors
    if (req.dbUser!.role === "investor") {
      await prisma.documentRecipient.updateMany({
        where: { documentId: id, investorId: req.dbUser!.id, viewedAt: null },
        data: { viewedAt: new Date() },
      });
    }

    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});

// POST /documents (admin only)
router.post("/", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createDocumentSchema.parse(req.body);

    // Validate property belongs to org if provided
    if (data.propertyId) {
      const prop = await prisma.property.findFirst({
        where: { id: data.propertyId, orgId: req.dbUser!.orgId, deletedAt: null },
      });
      if (!prop) throw new NotFoundError("Property", data.propertyId);
    }

    const doc = await prisma.document.create({
      data: {
        orgId: req.dbUser!.orgId,
        uploadedBy: req.dbUser!.id,
        ...data,
      },
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
});

// PATCH /documents/:id (admin only)
router.patch("/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const data = updateDocumentSchema.parse(req.body);

    const existing = await prisma.document.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError("Document", id);

    const doc = await prisma.document.update({ where: { id }, data });
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});

// DELETE /documents/:id (admin only, soft delete)
router.delete("/:id", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const existing = await prisma.document.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundError("Document", id);

    await prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
    res.json({ success: true, data: { message: "Document deleted" } });
  } catch (err) { next(err); }
});

// POST /documents/:id/share (admin only — share with investors)
router.post("/:id/share", requireRole("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const { investorIds } = shareDocumentSchema.parse(req.body);

    const doc = await prisma.document.findFirst({
      where: { id, orgId: req.dbUser!.orgId, deletedAt: null },
    });
    if (!doc) throw new NotFoundError("Document", id);

    const result = await prisma.documentRecipient.createMany({
      data: investorIds.map((investorId: string) => ({ documentId: id, investorId })),
      skipDuplicates: true,
    });

    res.json({ success: true, data: { shared: result.count } });
  } catch (err) { next(err); }
});

// POST /documents/:id/track-download (investor marks download)
router.post("/:id/track-download", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidParam.parse(req.params.id);

    const updated = await prisma.documentRecipient.updateMany({
      where: { documentId: id, investorId: req.dbUser!.id, downloadedAt: null },
      data: { downloadedAt: new Date() },
    });

    res.json({ success: true, data: { tracked: updated.count > 0 } });
  } catch (err) { next(err); }
});

export default router;
