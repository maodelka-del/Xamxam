import { Router, type IRouter } from "express";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { eq, ilike, and, desc, sql } from "drizzle-orm";
import { db, documentsTable, categoriesTable, documentFilesTable } from "@workspace/db";
import {
  ListDocumentsQueryParams,
  GetDocumentParams,
  UpdateDocumentParams,
  UpdateDocumentBody,
  DeleteDocumentParams,
  CreateDocumentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const DOC_SELECT = {
  id: documentsTable.id,
  title: documentsTable.title,
  description: documentsTable.description,
  subject: documentsTable.subject,
  level: documentsTable.level,
  semester: documentsTable.semester,
  docType: documentsTable.docType,
  categoryId: documentsTable.categoryId,
  sellerId: documentsTable.sellerId,
  categoryName: categoriesTable.name,
  price: documentsTable.price,
  downloadPrice: documentsTable.downloadPrice,
  previewUrl: documentsTable.previewUrl,
  fileUrl: documentsTable.fileUrl,
  isFeatured: documentsTable.isFeatured,
  pageCount: documentsTable.pageCount,
  downloadCount: documentsTable.downloadCount,
  createdAt: documentsTable.createdAt,
};

const mapDoc = (d: any) => ({
  ...d,
  createdAt: d.createdAt.toISOString(),
  categoryName: d.categoryName ?? null,
  semester: d.semester ?? null,
  docType: d.docType ?? null,
});

router.get("/documents/featured", async (_req, res): Promise<void> => {
  const docs = await db
    .select(DOC_SELECT)
    .from(documentsTable)
    .leftJoin(categoriesTable, eq(documentsTable.categoryId, categoriesTable.id))
    .where(eq(documentsTable.isFeatured, true))
    .orderBy(desc(documentsTable.downloadCount))
    .limit(6);
  res.json(docs.map(mapDoc));
});

router.get("/documents", async (req, res): Promise<void> => {
  const parsed = ListDocumentsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { category, level, search, page, limit } = parsed.data;
  const offset = (page - 1) * limit;
  const conditions = [];
  if (level) conditions.push(eq(documentsTable.level, level));
  if (search) conditions.push(ilike(documentsTable.title, `%${search}%`));
  if (category) {
    const cat = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, category)).limit(1);
    if (cat[0]) conditions.push(eq(documentsTable.categoryId, cat[0].id));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [docs, countResult] = await Promise.all([
    db.select(DOC_SELECT).from(documentsTable)
      .leftJoin(categoriesTable, eq(documentsTable.categoryId, categoriesTable.id))
      .where(whereClause).orderBy(desc(documentsTable.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(documentsTable).where(whereClause),
  ]);

  res.json({ documents: docs.map(mapDoc), total: countResult[0]?.count ?? 0, page, totalPages: Math.ceil((countResult[0]?.count ?? 0) / limit) });
});

router.get("/documents/admin/create", async (_req, res): Promise<void> => {
  res.status(405).json({ error: "Use POST" });
});

router.post("/documents/admin/create", async (req, res): Promise<void> => {
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const sellerId = (req.body as Record<string, unknown>).sellerId;
  const sellerIdNum = typeof sellerId === "number" ? sellerId : (typeof sellerId === "string" ? parseInt(sellerId, 10) || null : null);

  const [doc] = await db.insert(documentsTable).values({
    title: parsed.data.title,
    description: parsed.data.description || "Document académique",
    subject: parsed.data.subject,
    level: parsed.data.level,
    semester: parsed.data.semester || null,
    docType: parsed.data.docType || null,
    categoryId: parsed.data.categoryId ?? null,
    sellerId: sellerIdNum,
    price: parsed.data.price,
    downloadPrice: (parsed.data as any).downloadPrice ?? null,
    previewUrl: parsed.data.previewUrl ?? null,
    fileUrl: parsed.data.fileUrl ?? null,
    isFeatured: parsed.data.isFeatured ?? false,
    pageCount: parsed.data.pageCount ?? null,
  }).returning();

  if (!doc) {
    res.status(500).json({ error: "Échec de l'insertion en base de données" });
    return;
  }

  const categoryName = doc.categoryId
    ? (await db.select().from(categoriesTable).where(eq(categoriesTable.id, doc.categoryId)).limit(1))[0]?.name ?? null
    : null;

  res.status(201).json(mapDoc({ ...doc, categoryName }));
});

router.get("/documents/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetDocumentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [doc] = await db.select(DOC_SELECT).from(documentsTable)
    .leftJoin(categoriesTable, eq(documentsTable.categoryId, categoriesTable.id))
    .where(eq(documentsTable.id, params.data.id));

  if (!doc) { res.status(404).json({ error: "Document non trouvé" }); return; }
  res.json(mapDoc(doc));
});

router.patch("/documents/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateDocumentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateDocumentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.subject !== undefined) updates.subject = parsed.data.subject;
  if (parsed.data.level !== undefined) updates.level = parsed.data.level;
  if (parsed.data.semester !== undefined) updates.semester = parsed.data.semester;
  if (parsed.data.docType !== undefined) updates.docType = parsed.data.docType;
  if (parsed.data.categoryId !== undefined) updates.categoryId = parsed.data.categoryId;
  if (parsed.data.price !== undefined) updates.price = parsed.data.price;
  if ((parsed.data as any).downloadPrice !== undefined) updates.downloadPrice = (parsed.data as any).downloadPrice;
  if (parsed.data.previewUrl !== undefined) updates.previewUrl = parsed.data.previewUrl;
  if (parsed.data.fileUrl !== undefined) updates.fileUrl = parsed.data.fileUrl;
  if (parsed.data.isFeatured !== undefined) updates.isFeatured = parsed.data.isFeatured;
  if (parsed.data.pageCount !== undefined) updates.pageCount = parsed.data.pageCount;

  const [doc] = await db.update(documentsTable).set(updates).where(eq(documentsTable.id, params.data.id)).returning();
  if (!doc) { res.status(404).json({ error: "Document non trouvé" }); return; }

  const categoryName = doc.categoryId
    ? (await db.select().from(categoriesTable).where(eq(categoriesTable.id, doc.categoryId)).limit(1))[0]?.name ?? null
    : null;

  res.json(mapDoc({ ...doc, categoryName }));
});

router.delete("/documents/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteDocumentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [doc] = await db.delete(documentsTable).where(eq(documentsTable.id, params.data.id)).returning();
  if (!doc) { res.status(404).json({ error: "Document non trouvé" }); return; }
  res.sendStatus(204);
});

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

/**
 * GET /documents/:id/view-file/:fileId
 * Sert un fichier en lecture seule (inline) pour les documents gratuits (price === 0).
 * Le téléchargement est bloqué côté serveur.
 */
router.get("/documents/:id/view-file/:fileId", async (req, res): Promise<void> => {
  const docId  = parseInt(req.params.id,     10);
  const fileId = parseInt(req.params.fileId, 10);

  if (!docId || !fileId) {
    res.status(400).json({ error: "Paramètres invalides" });
    return;
  }

  const [doc] = await db.select({ id: documentsTable.id, price: documentsTable.price })
    .from(documentsTable)
    .where(eq(documentsTable.id, docId))
    .limit(1);

  if (!doc) { res.status(404).json({ error: "Document introuvable" }); return; }
  if (doc.price !== 0) { res.status(403).json({ error: "Ce document est payant" }); return; }

  const [file] = await db.select()
    .from(documentFilesTable)
    .where(and(eq(documentFilesTable.id, fileId), eq(documentFilesTable.documentId, docId)))
    .limit(1);

  if (!file) { res.status(404).json({ error: "Fichier introuvable" }); return; }

  try {
    const filePath = path.join(UPLOAD_DIR, path.basename(file.objectPath));
    await stat(filePath);

    const safeName = file.fileName.replace(/[^\w\s.-]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    createReadStream(filePath).pipe(res);
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      res.status(404).json({ error: "Fichier introuvable sur le disque" });
      return;
    }
    req.log.error({ err: error }, "Erreur lors de la lecture du fichier");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
