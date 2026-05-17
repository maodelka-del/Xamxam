import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, categoriesTable, documentsTable } from "@workspace/db";
import { CreateCategoryBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categories", async (req, res): Promise<void> => {
  const cats = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      description: categoriesTable.description,
      documentCount: sql<number>`count(${documentsTable.id})::int`,
    })
    .from(categoriesTable)
    .leftJoin(documentsTable, eq(documentsTable.categoryId, categoriesTable.id))
    .groupBy(categoriesTable.id)
    .orderBy(categoriesTable.name);

  res.json(cats.map((c) => ({ ...c, description: c.description ?? null })));
});

router.post("/categories", async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let cat: typeof categoriesTable.$inferSelect | undefined;
  try {
    const rows = await db
      .insert(categoriesTable)
      .values({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description ?? null,
      })
      .returning();
    cat = rows[0];
  } catch (err: unknown) {
    const code = (err as any)?.code ?? "";
    const cause = (err as any)?.cause;
    const causeCode = (cause as any)?.code ?? "";
    const isUnique = code === "23505" || causeCode === "23505" || code === "SQLITE_CONSTRAINT_UNIQUE";
    if (isUnique) {
      res.status(409).json({ error: `Une catégorie avec le slug "${parsed.data.slug}" existe déjà.` });
    } else {
      res.status(500).json({ error: "Impossible de créer la catégorie. Vérifiez vos données." });
    }
    return;
  }

  if (!cat) {
    res.status(500).json({ error: "Échec de l'insertion de la catégorie." });
    return;
  }

  res.status(201).json({ ...cat, documentCount: 0, description: cat.description ?? null });
});

router.patch("/categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  const { name, slug, description } = req.body as { name?: string; slug?: string; description?: string };
  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (slug) updates.slug = slug;
  if (description !== undefined) updates.description = description ?? null;
  const [updated] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Catégorie introuvable" }); return; }
  res.json({ ...updated, documentCount: 0, description: updated.description ?? null });
});

router.delete("/categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  const [deleted] = await db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Catégorie introuvable" }); return; }
  res.sendStatus(204);
});

export default router;
