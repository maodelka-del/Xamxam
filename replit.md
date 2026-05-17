# DokMart - Marketplace de Documents Numériques

Une marketplace pour acheter et vendre des documents numériques éducatifs (ebooks, templates, fiches de révision, etc.).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/dokmart run dev` — run the frontend (port 23718)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui (artifacts/dokmart)
- API: Express 5 (artifacts/api-server)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/db/src/schema/` — Drizzle DB schema (documents, categories, levels, orders, sellers, etc.)
- `lib/api-client-react/src/generated/` — Generated React Query hooks
- `lib/api-zod/src/generated/` — Generated Zod validation schemas
- `artifacts/api-server/src/routes/` — API route handlers
- `artifacts/dokmart/src/` — Frontend React app
- `attached_assets/` — Static assets

## Architecture decisions

- OpenAPI-first: all API types are generated from `openapi.yaml`, never hand-written
- Cookie-based auth for seller authentication
- Object storage for file uploads (presigned URLs)
- Admin routes for document/order/seller management
- No user accounts for buyers — orders tracked by email

## Product

- Public marketplace to browse and purchase digital documents
- Buyer checkout flow with payment proof upload
- Admin panel to manage documents, orders, categories, levels
- Seller application system

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- Always run `pnpm --filter @workspace/db run push` after changing DB schema files

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
