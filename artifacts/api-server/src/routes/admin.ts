import { Router, type IRouter } from "express";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, documentsTable, categoriesTable, documentFilesTable } from "@workspace/db";
import {
  ListAdminOrdersQueryParams,
  GetAdminOrderParams,
  ReviewOrderParams,
  ReviewOrderBody,
} from "@workspace/api-zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { sendOrderApprovalEmail } from "../lib/mailer";

const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Seuls les fichiers PDF sont acceptes"));
    }
  },
});

const router: IRouter = Router();

router.post("/admin/upload", upload.single("file"), (req, res): void => {
  if (!req.file) {
    res.status(400).json({ error: "Aucun fichier recu" });
    return;
  }
  const fileUrl = `/api/uploads/${req.file.filename}`;
  res.json({ fileUrl, filename: req.file.originalname, size: req.file.size });
});

router.get("/admin/orders", async (req, res): Promise<void> => {
  const parsed = ListAdminOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status, page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  const whereClause = status ? eq(ordersTable.status, status) : undefined;

  const [orders, countResult] = await Promise.all([
    db
      .select()
      .from(ordersTable)
      .where(whereClause)
      .orderBy(desc(ordersTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(ordersTable)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  res.json({
    orders: orders.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      paymentMethod: o.paymentMethod ?? null,
      adminNote: o.adminNote ?? null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.get("/admin/orders/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetAdminOrderParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.id));

  if (!order) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }

  const items = await db
    .select({
      id: orderItemsTable.id,
      documentId: orderItemsTable.documentId,
      documentTitle: documentsTable.title,
      documentSubject: documentsTable.subject,
      documentLevel: documentsTable.level,
      price: orderItemsTable.price,
      fileUrl: documentsTable.fileUrl,
    })
    .from(orderItemsTable)
    .leftJoin(documentsTable, eq(orderItemsTable.documentId, documentsTable.id))
    .where(eq(orderItemsTable.orderId, order.id));

  res.json({
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    paymentMethod: order.paymentMethod ?? null,
    adminNote: order.adminNote ?? null,
    items: items.map((i) => ({
      ...i,
      documentTitle: i.documentTitle ?? "",
      documentSubject: i.documentSubject ?? "",
      documentLevel: i.documentLevel ?? "",
      fileUrl: i.fileUrl ?? null,
    })),
  });
});

router.patch("/admin/orders/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ReviewOrderParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ReviewOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db
    .update(ordersTable)
    .set({
      status: parsed.data.status,
      adminNote: parsed.data.adminNote ?? null,
    })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }

  if (parsed.data.status === "approved") {
    const items = await db
      .select({
        id: orderItemsTable.id,
        documentId: orderItemsTable.documentId,
        documentTitle: documentsTable.title,
        documentSubject: documentsTable.subject,
        documentLevel: documentsTable.level,
        price: orderItemsTable.price,
      })
      .from(orderItemsTable)
      .leftJoin(documentsTable, eq(orderItemsTable.documentId, documentsTable.id))
      .where(eq(orderItemsTable.orderId, order.id));

    if (items.length > 0) {
      const docIds = items.map((i) => i.documentId);
      await db
        .update(documentsTable)
        .set({ downloadCount: sql`${documentsTable.downloadCount} + 1` })
        .where(inArray(documentsTable.id, docIds));

      // Fetch all document files for the ordered documents
      const allFiles = docIds.length > 0
        ? await db
            .select()
            .from(documentFilesTable)
            .where(
              docIds.length === 1
                ? eq(documentFilesTable.documentId, docIds[0])
                : inArray(documentFilesTable.documentId, docIds)
            )
        : [];

      // Group files by documentId
      const filesByDoc = new Map<number, typeof allFiles>();
      for (const f of allFiles) {
        const arr = filesByDoc.get(f.documentId) ?? [];
        arr.push(f);
        filesByDoc.set(f.documentId, arr);
      }

      // Send approval email (non-blocking, errors are logged)
      sendOrderApprovalEmail({
        orderId: order.id,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        totalAmount: order.totalAmount,
        adminNote: order.adminNote ?? null,
        items: items.map((item) => ({
          documentTitle: item.documentTitle ?? "",
          documentSubject: item.documentSubject ?? "",
          documentLevel: item.documentLevel ?? "",
          price: item.price,
          files: (filesByDoc.get(item.documentId) ?? []).map((f) => ({
            id: f.id,
            fileName: f.fileName,
            fileSize: f.fileSize ?? null,
          })),
        })),
      }).catch(() => { /* already logged inside mailer */ });
    }
  }

  res.json({
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    paymentMethod: order.paymentMethod ?? null,
    adminNote: order.adminNote ?? null,
  });
});

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [
    totalDocuments,
    totalOrders,
    pendingPayments,
    approvedOrders,
    revenueResult,
    recentOrders,
    topDocuments,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(documentsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(ordersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.status, "payment_uploaded")),
    db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.status, "approved")),
    db.select({ total: sql<number>`coalesce(sum(total_amount), 0)::int` }).from(ordersTable).where(eq(ordersTable.status, "approved")),
    db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(5),
    db
      .select({
        id: documentsTable.id,
        title: documentsTable.title,
        description: documentsTable.description,
        subject: documentsTable.subject,
        level: documentsTable.level,
        categoryId: documentsTable.categoryId,
        categoryName: categoriesTable.name,
        price: documentsTable.price,
        previewUrl: documentsTable.previewUrl,
        fileUrl: documentsTable.fileUrl,
        isFeatured: documentsTable.isFeatured,
        pageCount: documentsTable.pageCount,
        downloadCount: documentsTable.downloadCount,
        createdAt: documentsTable.createdAt,
      })
      .from(documentsTable)
      .leftJoin(categoriesTable, eq(documentsTable.categoryId, categoriesTable.id))
      .orderBy(desc(documentsTable.downloadCount))
      .limit(5),
  ]);

  res.json({
    totalDocuments: totalDocuments[0]?.count ?? 0,
    totalOrders: totalOrders[0]?.count ?? 0,
    pendingPayments: pendingPayments[0]?.count ?? 0,
    approvedOrders: approvedOrders[0]?.count ?? 0,
    totalRevenueCfa: revenueResult[0]?.total ?? 0,
    recentOrders: recentOrders.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      paymentMethod: o.paymentMethod ?? null,
      adminNote: o.adminNote ?? null,
    })),
    topDocuments: topDocuments.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      categoryName: d.categoryName ?? null,
    })),
  });
});

export default router;
