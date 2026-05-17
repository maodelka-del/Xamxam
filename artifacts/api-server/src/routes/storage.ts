import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

/**
 * POST /storage/upload
 * Reçoit un fichier via multipart/form-data et le sauvegarde sur le disque Render.
 */
router.post("/storage/upload", upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "Aucun fichier reçu" });
    return;
  }
  const objectPath = `/uploads/${req.file.filename}`;
  res.json({ objectPath, fileName: req.file.originalname, fileSize: req.file.size });
});

export default router;
