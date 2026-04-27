# xvideo

Template-driven Seedance 2.0 video generation MVP.

## Apps

- `apps/server`: NestJS API
- `apps/web`: public creation site
- `apps/admin`: operator console
- `packages/shared`: shared schemas and types

## Docs

- `AGENTS.md`: cross-agent project rules
- `docs/superpowers/specs`: design specs
- `docs/superpowers/plans`: implementation plans

## Local setup

1. Install dependencies: `pnpm install`
2. Rebuild script-based dependencies if needed: `pnpm rebuild`
3. Set `DATABASE_URL=file:./dev.db`
4. Generate Prisma client: `pnpm --filter @xvideo/server exec prisma generate`
5. Push schema: `DATABASE_URL=file:./dev.db pnpm --filter @xvideo/server exec prisma db push`
6. Seed data: `DATABASE_URL=file:./dev.db pnpm --filter @xvideo/server exec ts-node prisma/seed.ts`
7. Start all apps: `pnpm dev`
