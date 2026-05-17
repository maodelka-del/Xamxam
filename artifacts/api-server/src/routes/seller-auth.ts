import { Router, type IRouter } from "express";
import { eq, and, inArray, sql } from "drizzle-orm";
import { db, sellersTable, documentsTable, categoriesTable, orderItemsTable, ordersTable } from "@workspace/db";
import { signToken, verifyToken, verifyPassword } from "../lib/auth";

const router: IRouter = Router();

async function getSellerFromCookie(req: { cookies: unknown }): Promise<number | null> {
  const token = (req.cookies as Record<string, string>)?.seller_token;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || typeof payload.sellerId !== "number") return null;
  return payload.sellerId;
}

router.post("/seller/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email et mot de passe requis" });
    return;
  }

  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.email, email.toLowerCase().trim()));
  if (!seller) {
    res.status(401).json({ error: "Identifiants incorrects" });
    return;
  }

  const valid = await verifyPassword(password, seller.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Identifiants incorrects" });
    return;
  }

  const token = signToken({ sellerId: seller.id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });

  res.cookie("seller_token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  res.json({
    id: seller.id,
    name: seller.name,
    email: seller.email,
    phone: seller.phone,
    productType: seller.productType,
    createdAt: seller.createdAt.toISOString(),
  });
});

router.get("/seller/auth/me", async (req, res): Promise<void> => {
  const sellerId = await getSellerFromCookie(req);
  if (!sellerId) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.id, sellerId));
  if (!seller) {
    res.status(401).json({ error: "Compte introuvable" });
    return;
  }

  res.json({
    id: seller.id,
    name: seller.name,
    email: seller.email,
    phone: seller.phone,
    productType: seller.productType,
    createdAt: seller.createdAt.toISOString(),
  });
});

router.post("/seller/auth/logout", (_req, res): void => {
  res.clearCookie("seller_token", { path: "/" });
  res.json({ ok: true });
});

router.get("/seller/products", async (req, res): Promise<void> => {
  const sellerId = await getSellerFromCookie(req);
  if (!sellerId) { res.status(401).json({ error: "Non authentifié" }); return; }

  const docs = await db
    .select({
      id: documentsTable.id,
      title: documentsTable.title,
      description: documentsTable.description,
      subject: documentsTable.subject,
      level: documentsTable.level,
      price: documentsTable.price,
      categoryId: documentsTable.categoryId,
      categoryName: categoriesTable.name,
      downloadCount: documentsTable.downloadCount,
      isFeatured: documentsTable.isFeatured,
      previewUrl: documentsTable.previewUrl,
      createdAt: documentsTable.createdAt,
    })
    .from(documentsTable)
    .leftJoin(categoriesTable, eq(documentsTable.categoryId, categoriesTable.id))
    .where(eq(documentsTable.sellerId, sellerId))
    .orderBy(documentsTable.createdAt);

  res.json(docs.map(d => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
    categoryName: d.categoryName ?? null,
  })));
});

router.get("/seller/stats", async (req, res): Promise<void> => {
  const sellerId = await getSellerFromCookie(req);
  if (!sellerId) { res.status(401).json({ error: "Non authentifié" }); return; }

  const sellerDocs = await db
    .select({ id: documentsTable.id })
    .from(documentsTable)
    .where(eq(documentsTable.sellerId, sellerId));

  const docIds = sellerDocs.map(d => d.id);
  const productCount = sellerDocs.length;

  if (docIds.length === 0) {
    res.json({ productCount: 0, salesCount: 0, revenue: 0, totalViews: 0 });
    return;
  }

  const approvedItems = await db
    .select({
      price: orderItemsTable.price,
      orderId: orderItemsTable.orderId,
    })
    .from(orderItemsTable)
    .innerJoin(ordersTable, and(
      eq(orderItemsTable.orderId, ordersTable.id),
      eq(ordersTable.status, "approved")
    ))
    .where(
      docIds.length === 1
        ? eq(orderItemsTable.documentId, docIds[0])
        : inArray(orderItemsTable.documentId, docIds)
    );

  const revenue = approvedItems.reduce((sum, i) => sum + i.price, 0);
  const salesCount = approvedItems.length;

  const viewsResult = await db
    .select({ views: sql<number>`coalesce(sum(${documentsTable.downloadCount}), 0)::int` })
    .from(documentsTable)
    .where(
      docIds.length === 1
        ? eq(documentsTable.id, docIds[0])
        : inArray(documentsTable.id, docIds)
    );

  const totalViews = viewsResult[0]?.views ?? 0;

  res.json({ productCount, salesCount, revenue, totalViews });
});

export default router;
