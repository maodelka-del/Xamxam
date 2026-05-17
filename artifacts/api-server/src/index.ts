import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function findWorkspaceRoot(start: string): string {
  let dir = path.resolve(start);
  for (let i = 0; i < 10; i++) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

async function migrate(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    logger.warn("DATABASE_URL not set — skipping database migration");
    return;
  }
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  try {
    logger.info({ workspaceRoot }, "Running database migrations…");
    execSync("pnpm --filter @workspace/db run push-force", {
      cwd: workspaceRoot,
      stdio: "pipe",
      timeout: 60_000,
    });
    logger.info("Database migrations completed successfully");
  } catch (err) {
    logger.error({ err }, "Database migration failed — server will still start but DB may be misconfigured");
  }
}

migrate().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
});
