import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, levelsTable, documentsTable } from "@workspace/db";
import { CreateLevelBody, DeleteLevelParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/levels", async (req, res): Promise<void> => {
  const levels = await db
    .select({
      id: levelsTable.id,
      name: levelsTable.name,
      slug: levelsTable.slug,
      group: levelsTable.group,
      description: levelsTable.description,
      sortOrder: levelsTable.sortOrder,
      documentCount: sql<number>`count(${documentsTable.id})::int`,
    })
    .from(levelsTable)
    .leftJoin(documentsTable, eq(documentsTable.level, levelsTable.slug))
    .groupBy(levelsTable.id)
    .orderBy(levelsTable.sortOrder, levelsTable.name);

  res.json(levels.map((l) => ({ ...l, group: l.group ?? null, description: l.description ?? null })));
});

router.post("/levels", async (req, res): Promise<void> => {
  const parsed = CreateLevelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let level: typeof levelsTable.$inferSelect | undefined;
  try {
    const rows = await db
      .insert(levelsTable)
      .values({
        name: parsed.data.name,
        slug: parsed.data.slug,
        group: parsed.data.group ?? null,
        description: parsed.data.description ?? null,
        sortOrder: parsed.data.sortOrder ?? 0,
      })
      .returning();
    level = rows[0];
  } catch (err: unknown) {
    const code = (err as any)?.code ?? "";
    const cause = (err as any)?.cause;
    const causeCode = (cause as any)?.code ?? "";
    const isUnique = code === "23505" || causeCode === "23505" || code === "SQLITE_CONSTRAINT_UNIQUE";
    if (isUnique) {
      res.status(409).json({ error: `Un niveau avec le slug "${parsed.data.slug}" existe déjà.` });
    } else {
      res.status(500).json({ error: "Impossible de créer le niveau. Vérifiez vos données." });
    }
    return;
  }

  if (!level) {
    res.status(500).json({ error: "Échec de l'insertion du niveau." });
    return;
  }

  res.status(201).json({ ...level, documentCount: 0, group: level.group ?? null, description: level.description ?? null });
});

router.patch("/levels/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  const { name, slug, group, sortOrder } = req.body as { name?: string; slug?: string; group?: string; sortOrder?: number };
  const updates: Record<string, unknown> = {};
  if (name) updates.name = name;
  if (slug) updates.slug = slug;
  if (group !== undefined) updates.group = group ?? null;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  const [updated] = await db.update(levelsTable).set(updates).where(eq(levelsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Niveau introuvable" }); return; }
  res.json({ ...updated, documentCount: 0, group: updated.group ?? null, description: updated.description ?? null });
});

router.delete("/levels/:id", async (req, res): Promise<void> => {
  const parsed = DeleteLevelParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.delete(levelsTable).where(eq(levelsTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
