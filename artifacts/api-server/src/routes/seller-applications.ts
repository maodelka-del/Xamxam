import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, sellerApplicationsTable, sellersTable, documentsTable } from "@workspace/db";
import { CreateSellerApplicationBody, ReviewSellerApplicationBody } from "@workspace/api-zod";
import { hashPassword } from "../lib/auth";

const router: IRouter = Router();

router.post("/seller-applications", async (req, res): Promise<void> => {
  const parsed = CreateSellerApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const rows = await db
    .insert(sellerApplicationsTable)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      productType: parsed.data.productType,
      description: parsed.data.description,
      portfolioUrl: parsed.data.portfolioUrl ?? null,
      passwordHash,
    })
    .returning();

  const app = rows[0];
  if (!app) {
    res.status(500).json({ error: "Échec de l'enregistrement de la candidature." });
    return;
  }

  const { passwordHash: _ph, ...safeApp } = app;
  res.status(201).json({ ...safeApp, createdAt: app.createdAt.toISOString() });
});

router.get("/admin/seller-applications", async (req, res): Promise<void> => {
  const { status } = req.query as { status?: string };

  const rows = await db
    .select()
    .from(sellerApplicationsTable)
    .orderBy(desc(sellerApplicationsTable.createdAt));

  const filtered = status ? rows.filter((r) => r.status === status) : rows;

  const safeApplications = filtered.map(({ passwordHash: _ph, ...a }) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));

  res.json({
    applications: safeApplications,
    total: safeApplications.length,
  });
});

router.patch("/admin/seller-applications/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }

  const parsed = ReviewSellerApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(sellerApplicationsTable)
    .set({
      status: parsed.data.status,
      adminNote: parsed.data.adminNote ?? null,
    })
    .where(eq(sellerApplicationsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Candidature introuvable" }); return; }

  if (parsed.data.status === "approved") {
    const [existing] = await db
      .select()
      .from(sellersTable)
      .where(eq(sellersTable.email, updated.email));

    if (!existing) {
      const passwordHash = updated.passwordHash ?? await hashPassword(Math.random().toString(36).slice(2));
      await db.insert(sellersTable).values({
        name: updated.name,
        email: updated.email,
        passwordHash,
        phone: updated.phone,
        productType: updated.productType,
        applicationId: updated.id,
      });
    }
  }

  const { passwordHash: _ph, ...safeUpdated } = updated;
  res.json({ ...safeUpdated, createdAt: updated.createdAt.toISOString() });
});

router.get("/admin/sellers", async (_req, res): Promise<void> => {
  const sellers = await db
    .select()
    .from(sellersTable)
    .orderBy(desc(sellersTable.createdAt));

  res.json(sellers.map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    productType: s.productType,
    applicationId: s.applicationId,
    createdAt: s.createdAt.toISOString(),
  })));
});

router.delete("/admin/sellers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }

  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.id, id));
  if (!seller) { res.status(404).json({ error: "Vendeur introuvable" }); return; }

  await db.update(documentsTable).set({ sellerId: null }).where(eq(documentsTable.sellerId, id));

  if (seller.applicationId) {
    await db
      .update(sellerApplicationsTable)
      .set({ status: "rejected" })
      .where(eq(sellerApplicationsTable.id, seller.applicationId));
  }

  await db.delete(sellersTable).where(eq(sellersTable.id, id));

  res.json({ ok: true });
});

export default router;
