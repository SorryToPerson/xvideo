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
4. Set provider env vars:
   - `ARK_API_KEY=<your-ark-api-key>`
   - `SEEDANCE_MODEL=<your-ark-endpoint-id-or-seedance-model-id>`
   - optional `ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3`
   - optional `SEEDANCE_TASK_PATH=/contents/generations/tasks`
5. Generate Prisma client: `pnpm --filter @xvideo/server exec prisma generate`
6. Push schema: `DATABASE_URL=file:./dev.db pnpm --filter @xvideo/server exec prisma db push`
7. Seed data: `DATABASE_URL=file:./dev.db pnpm --filter @xvideo/server exec ts-node prisma/seed.ts`
8. Start all apps: `pnpm dev`

## Seedance Notes

- Official Ark auth docs use `ARK_API_KEY` and base URL `https://ark.cn-beijing.volces.com/api/v3`
- This project calls the Seedance task API through `POST/GET /contents/generations/tasks`
- `SEEDANCE_MODEL` should point to the video model or endpoint you have enabled in Ark
