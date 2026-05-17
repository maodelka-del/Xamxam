import { Router, type IRouter } from "express";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { eq, and, inArray } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, documentsTable, documentFilesTable } from "@workspace/db";
import {
  GetOrderParams,
  GetOrderQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

router.get("/orders/:id", async (req, res): Promise<void> => {
  const rawId  = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetOrderParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const query = GetOrderQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: "Email requis" }); return; }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, params.data.id), eq(ordersTable.customerEmail, query.data.email)));

  if (!order) { res.status(404).json({ error: "Commande introuvable" }); return; }

  const items = await db
    .select({
      id:              orderItemsTable.id,
      documentId:      orderItemsTable.documentId,
      documentTitle:   documentsTable.title,
      documentSubject: documentsTable.subject,
      documentLevel:   documentsTable.level,
      price:           orderItemsTable.price,
      fileUrl:         documentsTable.fileUrl,
    })
    .from(orderItemsTable)
    .leftJoin(documentsTable, eq(orderItemsTable.documentId, documentsTable.id))
    .where(eq(orderItemsTable.orderId, order.id));

  const mappedItems = items.map((i) => ({
    ...i,
    documentTitle:   i.documentTitle   ?? "",
    documentSubject: i.documentSubject ?? "",
    documentLevel:   i.documentLevel   ?? "",
    fileUrl: order.status === "approved" ? (i.fileUrl ?? null) : null,
  }));

  res.json({
    ...order,
    createdAt:     order.createdAt.toISOString(),
    updatedAt:     order.updatedAt.toISOString(),
    paymentMethod: order.paymentMethod ?? null,
    adminNote:     order.adminNote     ?? null,
    items:         mappedItems,
  });
});

/**
 * GET /orders/:orderId/view-file/:fileId?email=xxx&download=1
 * Sert un fichier PDF depuis le disque de manière sécurisée.
 */
router.get("/orders/:orderId/view-file/:fileId", async (req, res): Promise<void> => {
  const orderId      = parseInt(req.params.orderId, 10);
  const fileId       = parseInt(req.params.fileId, 10);
  const email        = (req.query.email as string) ?? "";
  const forceDownload = req.query.download === "1";

  if (!orderId || !fileId || !email) {
    res.status(400).json({ error: "Paramètres manquants" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) { res.status(404).json({ error: "Commande introuvable" }); return; }
  if (order.customerEmail.toLowerCase() !== email.toLowerCase()) { res.status(403).json({ error: "Accès refusé" }); return; }
  if (order.status !== "approved") { res.status(403).json({ error: "Commande non encore approuvée" }); return; }

  const items  = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  const docIds = items.map((i) => i.documentId);

  const [file] = await db
    .select()
    .from(documentFilesTable)
    .where(
      and(
        eq(documentFilesTable.id, fileId),
        docIds.length === 1
          ? eq(documentFilesTable.documentId, docIds[0])
          : inArray(documentFilesTable.documentId, docIds)
      )
    )
    .limit(1);

  if (!file) { res.status(404).json({ error: "Fichier introuvable ou accès refusé" }); return; }

  try {
    const filePath = path.join(UPLOAD_DIR, path.basename(file.objectPath));
    await stat(filePath);

    const safeName = file.fileName.replace(/[^\w\s.-]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${forceDownload ? "attachment" : "inline"}; filename="${safeName}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
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
