import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, documentFilesTable } from "@workspace/db";
import { AddDocumentFileBody, DeleteDocumentFileParams, GetDocumentFilesParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/documents/:id/files", async (req, res): Promise<void> => {
  const parsed = GetDocumentFilesParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const files = await db
    .select()
    .from(documentFilesTable)
    .where(eq(documentFilesTable.documentId, parsed.data.id))
    .orderBy(documentFilesTable.sortOrder, documentFilesTable.createdAt);

  res.json(
    files.map((f) => ({
      ...f,
      fileSize: f.fileSize ?? null,
      createdAt: f.createdAt.toISOString(),
    }))
  );
});

router.post("/documents/:id/files", async (req, res): Promise<void> => {
  const idParsed = GetDocumentFilesParams.safeParse({ id: parseInt(req.params.id, 10) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = AddDocumentFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [file] = await db
    .insert(documentFilesTable)
    .values({
      documentId: idParsed.data.id,
      objectPath: parsed.data.objectPath,
      fileName: parsed.data.fileName,
      fileSize: parsed.data.fileSize ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
    })
    .returning();

  res.status(201).json({
    ...file,
    fileSize: file.fileSize ?? null,
    createdAt: file.createdAt.toISOString(),
  });
});

router.delete("/documents/:id/files/:fileId", async (req, res): Promise<void> => {
  const parsed = DeleteDocumentFileParams.safeParse({
    id: parseInt(req.params.id, 10),
    fileId: parseInt(req.params.fileId, 10),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  await db
    .delete(documentFilesTable)
    .where(
      and(
        eq(documentFilesTable.id, parsed.data.fileId),
        eq(documentFilesTable.documentId, parsed.data.id)
      )
    );

  res.status(204).send();
});

export default router;
