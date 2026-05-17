import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
app.use("/api/uploads", express.static(uploadDir));

app.use("/api", router);

// Global JSON error handler — must be 4-argument to be treated as error middleware
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as any)?.status ?? (err as any)?.statusCode ?? 500;
  const rawMessage: string = (err as any)?.message ?? "Internal server error";
  logger.error({ err }, "Unhandled error");
  // In production, hide raw DB/internal messages; in dev, show them truncated
  const isDbError = rawMessage.startsWith("Failed query") || rawMessage.includes("relation") || rawMessage.includes("column");
  const message = process.env.NODE_ENV === "production" && isDbError
    ? "Erreur interne du serveur. Vérifiez la configuration de la base de données."
    : rawMessage.length > 200 ? rawMessage.slice(0, 200) + "…" : rawMessage;
  res.status(status).json({ error: message });
});

if (process.env.NODE_ENV === "production") {
  // __dirname is defined by the esbuild banner — resolves to artifacts/api-server/dist
  // Go up 3 levels to reach the workspace root, then into the frontend build
  const frontendDist = path.resolve(__dirname, "..", "..", "..", "artifacts", "dokmart", "dist", "public");
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
