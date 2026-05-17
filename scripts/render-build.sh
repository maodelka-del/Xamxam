#!/usr/bin/env bash
set -e

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Building lib packages..."
pnpm run typecheck:libs

echo "==> Building frontend (dokmart)..."
pnpm --filter @workspace/dokmart run build

echo "==> Building API server..."
pnpm --filter @workspace/api-server run build

echo "==> Running database migrations..."
pnpm --filter @workspace/db run push-force

echo "==> Build complete."
