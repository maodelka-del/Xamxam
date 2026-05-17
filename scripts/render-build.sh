#!/usr/bin/env bash
set -e

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Building lib packages..."
pnpm run typecheck:libs

echo "==> Copying PDF.js worker to public dir..."
cp artifacts/dokmart/node_modules/pdfjs-dist/build/pdf.worker.min.mjs artifacts/dokmart/public/pdf.worker.min.mjs

echo "==> Building frontend (dokmart)..."
pnpm --filter @workspace/dokmart run build

echo "==> Building API server..."
pnpm --filter @workspace/api-server run build

echo "==> Running database migrations..."
pnpm --filter @workspace/db run push-force

echo "==> Build complete."
