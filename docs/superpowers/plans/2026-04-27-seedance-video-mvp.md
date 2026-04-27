# Seedance Video MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working single-tenant MVP of a template-driven Seedance 2.0 AI video generation web app for ordinary users, with long-video-ready backend modeling.

**Architecture:** Use a monorepo with a NestJS backend, a React + Tailwind public web app, a React + Tailwind admin app, and a shared package for schemas and types. Keep Seedance integration behind a provider adapter and model long-video orchestration through job and scene records from day one.

**Tech Stack:** Node.js, pnpm workspaces, NestJS, React, Tailwind CSS, TypeScript, PostgreSQL, Prisma, Zod, FFmpeg-ready composition hooks

---

### Task 1: Initialize Workspace and Monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `tsconfig.base.json`
- Create: `README.md`

- [ ] **Step 1: Create the root `package.json`**

```json
{
  "name": "xvideo",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build"
  }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - apps/*
  - packages/*
```

- [ ] **Step 3: Create `.gitignore`**

```gitignore
node_modules
dist
.DS_Store
.env
.env.local
.env.*.local
coverage
.turbo
pnpm-lock.yaml
apps/server/prisma/dev.db
apps/server/prisma/dev.db-journal
uploads
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@xvideo/shared/*": ["packages/shared/src/*"]
    }
  }
}
```

- [ ] **Step 5: Create `README.md`**

```md
# xvideo

Template-driven Seedance 2.0 video generation MVP.

## Apps

- `apps/server`: NestJS API
- `apps/web`: public creation site
- `apps/admin`: operator console
- `packages/shared`: shared schemas and types
```

- [ ] **Step 6: Initialize git repository**

Run: `git init`
Expected: repository initialized in the current folder

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml .gitignore tsconfig.base.json README.md
git commit -m "chore: initialize monorepo workspace"
```

### Task 2: Scaffold Shared Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/video-template.ts`
- Create: `packages/shared/src/generation.ts`

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@xvideo/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "zod": "^3.24.1"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/shared/src/video-template.ts`**

```ts
import { z } from "zod";

export const generationStrategySchema = z.enum(["single", "extend", "storyboard"]);

export const templateInputFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "textarea", "select"]),
  required: z.boolean(),
  helpText: z.string().optional()
});

export const templateSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  defaultStrategy: generationStrategySchema
});

export type GenerationStrategy = z.infer<typeof generationStrategySchema>;
export type TemplateInputField = z.infer<typeof templateInputFieldSchema>;
export type TemplateSummary = z.infer<typeof templateSummarySchema>;
```

- [ ] **Step 4: Create `packages/shared/src/generation.ts`**

```ts
import { z } from "zod";
import { generationStrategySchema } from "./video-template";

export const createGenerationRequestSchema = z.object({
  templateSlug: z.string(),
  strategy: generationStrategySchema,
  script: z.string().min(10),
  referenceImageIds: z.array(z.string()).max(3).default([]),
  clientId: z.string()
});

export const generationJobStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed"
]);

export type CreateGenerationRequest = z.infer<typeof createGenerationRequestSchema>;
export type GenerationJobStatus = z.infer<typeof generationJobStatusSchema>;
```

- [ ] **Step 5: Create `packages/shared/src/index.ts`**

```ts
export * from "./video-template";
export * from "./generation";
```

- [ ] **Step 6: Commit**

```bash
git add packages/shared
git commit -m "feat: add shared schemas for templates and generation"
```

### Task 3: Scaffold NestJS Backend

**Files:**
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/nest-cli.json`
- Create: `apps/server/src/main.ts`
- Create: `apps/server/src/app.module.ts`
- Create: `apps/server/src/health/health.controller.ts`
- Create: `apps/server/src/config/env.ts`

- [ ] **Step 1: Create `apps/server/package.json`**

```json
{
  "name": "@xvideo/server",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main.js"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/core": "^11.0.1",
    "@nestjs/platform-express": "^11.0.1",
    "@prisma/client": "^6.6.0",
    "@xvideo/shared": "workspace:*",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.1",
    "@types/express": "^5.0.0",
    "prisma": "^6.6.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Create `apps/server/src/main.ts`**

```ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  await app.listen(3001);
}

bootstrap();
```

- [ ] **Step 3: Create `apps/server/src/app.module.ts`**

```ts
import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";

@Module({
  controllers: [HealthController]
})
export class AppModule {}
```

- [ ] **Step 4: Create `apps/server/src/health/health.controller.ts`**

```ts
import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return { ok: true };
  }
}
```

- [ ] **Step 5: Create `apps/server/src/config/env.ts`**

```ts
import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string(),
  SEEDANCE_API_KEY: z.string().optional(),
  SEEDANCE_BASE_URL: z.string().optional()
});
```

- [ ] **Step 6: Add `apps/server/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "outDir": "dist",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Add `apps/server/nest-cli.json`**

```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}
```

- [ ] **Step 8: Commit**

```bash
git add apps/server
git commit -m "feat: scaffold nestjs api server"
```

### Task 4: Add Prisma Schema and Core Domain Models

**Files:**
- Create: `apps/server/prisma/schema.prisma`
- Create: `apps/server/src/prisma/prisma.module.ts`
- Create: `apps/server/src/prisma/prisma.service.ts`

- [ ] **Step 1: Create `apps/server/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Template {
  id              String            @id @default(cuid())
  name            String
  slug            String            @unique
  description     String
  defaultStrategy String
  versions        TemplateVersion[]
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

model TemplateVersion {
  id              String          @id @default(cuid())
  templateId      String
  versionNumber   Int
  promptSkeleton  String
  inputSchemaJson String
  strategyJson    String
  template        Template        @relation(fields: [templateId], references: [id])
  jobs            GenerationJob[]
  createdAt       DateTime        @default(now())
}

model MediaAsset {
  id          String   @id @default(cuid())
  kind        String
  filename    String
  mimeType    String
  storagePath String
  width       Int?
  height      Int?
  createdAt   DateTime @default(now())
}

model GenerationJob {
  id                String               @id @default(cuid())
  clientId          String
  templateVersionId String
  strategy          String
  script            String
  status            String
  finalVideoId      String?
  failureSummary    String?
  templateVersion   TemplateVersion      @relation(fields: [templateVersionId], references: [id])
  scenes            GenerationScene[]
  attempts          GenerationAttempt[]
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
}

model GenerationScene {
  id             String   @id @default(cuid())
  jobId          String
  sequenceIndex  Int
  strategy       String
  title          String
  prompt         String
  status         String
  parentSceneId  String?
  providerTaskId String?
  job            GenerationJob @relation(fields: [jobId], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model GenerationAttempt {
  id              String   @id @default(cuid())
  jobId           String
  attemptNumber   Int
  providerName    String
  requestPayload  String
  responsePayload String?
  resultStatus    String
  job             GenerationJob @relation(fields: [jobId], references: [id])
  createdAt       DateTime @default(now())
}

model GeneratedVideo {
  id          String   @id @default(cuid())
  storagePath String
  durationMs  Int?
  width       Int?
  height      Int?
  posterPath  String?
  createdAt   DateTime @default(now())
}
```

- [ ] **Step 2: Create `apps/server/src/prisma/prisma.service.ts`**

```ts
import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

- [ ] **Step 3: Create `apps/server/src/prisma/prisma.module.ts`**

```ts
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService]
})
export class PrismaModule {}
```

- [ ] **Step 4: Run Prisma generate**

Run: `pnpm --filter @xvideo/server exec prisma generate`
Expected: Prisma client generated successfully

- [ ] **Step 5: Commit**

```bash
git add apps/server/prisma apps/server/src/prisma
git commit -m "feat: add prisma schema for templates and generation jobs"
```

### Task 5: Build Template Read APIs

**Files:**
- Create: `apps/server/src/templates/templates.module.ts`
- Create: `apps/server/src/templates/templates.service.ts`
- Create: `apps/server/src/templates/templates.controller.ts`
- Create: `apps/server/src/templates/template-seed.ts`

- [ ] **Step 1: Create `apps/server/src/templates/templates.service.ts`**

```ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  listTemplates() {
    return this.prisma.template.findMany({
      orderBy: { createdAt: "asc" }
    });
  }
}
```

- [ ] **Step 2: Create `apps/server/src/templates/templates.controller.ts`**

```ts
import { Controller, Get } from "@nestjs/common";
import { TemplatesService } from "./templates.service";

@Controller("templates")
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  listTemplates() {
    return this.templatesService.listTemplates();
  }
}
```

- [ ] **Step 3: Create `apps/server/src/templates/templates.module.ts`**

```ts
import { Module } from "@nestjs/common";
import { TemplatesController } from "./templates.controller";
import { TemplatesService } from "./templates.service";

@Module({
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService]
})
export class TemplatesModule {}
```

- [ ] **Step 4: Register `TemplatesModule` in `apps/server/src/app.module.ts`**

```ts
import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { TemplatesModule } from "./templates/templates.module";

@Module({
  imports: [PrismaModule, TemplatesModule],
  controllers: [HealthController]
})
export class AppModule {}
```

- [ ] **Step 5: Create `apps/server/src/templates/template-seed.ts`**

```ts
export const defaultTemplateSeed = {
  name: "Product Seeding",
  slug: "product-seeding",
  description: "A guided short product promo template for ordinary users.",
  defaultStrategy: "single"
};
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/templates apps/server/src/app.module.ts
git commit -m "feat: add template listing api"
```

### Task 6: Build Media Upload API

**Files:**
- Create: `apps/server/src/media-assets/media-assets.module.ts`
- Create: `apps/server/src/media-assets/media-assets.controller.ts`
- Create: `apps/server/src/media-assets/media-assets.service.ts`

- [ ] **Step 1: Create `apps/server/src/media-assets/media-assets.service.ts`**

```ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MediaAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async createUploadedAsset(filename: string, mimeType: string, storagePath: string) {
    return this.prisma.mediaAsset.create({
      data: {
        kind: "reference-image",
        filename,
        mimeType,
        storagePath
      }
    });
  }
}
```

- [ ] **Step 2: Create `apps/server/src/media-assets/media-assets.controller.ts`**

```ts
import { Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MediaAssetsService } from "./media-assets.service";

@Controller("media-assets")
export class MediaAssetsController {
  constructor(private readonly mediaAssetsService: MediaAssetsService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  async uploadReferenceImage(@UploadedFile() file: Express.Multer.File) {
    const storagePath = `uploads/${file.filename}`;

    return this.mediaAssetsService.createUploadedAsset(file.originalname, file.mimetype, storagePath);
  }
}
```

- [ ] **Step 3: Create `apps/server/src/media-assets/media-assets.module.ts`**

```ts
import { Module } from "@nestjs/common";
import { MediaAssetsController } from "./media-assets.controller";
import { MediaAssetsService } from "./media-assets.service";

@Module({
  controllers: [MediaAssetsController],
  providers: [MediaAssetsService]
})
export class MediaAssetsModule {}
```

- [ ] **Step 4: Register `MediaAssetsModule` in `AppModule`**

```ts
imports: [PrismaModule, TemplatesModule, MediaAssetsModule]
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/media-assets apps/server/src/app.module.ts
git commit -m "feat: add reference image upload api"
```

### Task 7: Implement Generation Jobs and Provider Adapter Skeleton

**Files:**
- Create: `apps/server/src/generation-jobs/generation-jobs.module.ts`
- Create: `apps/server/src/generation-jobs/generation-jobs.controller.ts`
- Create: `apps/server/src/generation-jobs/generation-jobs.service.ts`
- Create: `apps/server/src/providers/seedance/seedance.module.ts`
- Create: `apps/server/src/providers/seedance/seedance.service.ts`

- [ ] **Step 1: Create `apps/server/src/providers/seedance/seedance.service.ts`**

```ts
import { Injectable } from "@nestjs/common";

export type SeedanceCreateTaskInput = {
  prompt: string;
  strategy: "single" | "extend" | "storyboard";
};

@Injectable()
export class SeedanceService {
  async createVideoTask(input: SeedanceCreateTaskInput) {
    return {
      providerTaskId: `mock-${Date.now()}`,
      rawRequest: input,
      rawResponse: { accepted: true }
    };
  }
}
```

- [ ] **Step 2: Create `apps/server/src/providers/seedance/seedance.module.ts`**

```ts
import { Module } from "@nestjs/common";
import { SeedanceService } from "./seedance.service";

@Module({
  providers: [SeedanceService],
  exports: [SeedanceService]
})
export class SeedanceModule {}
```

- [ ] **Step 3: Create `apps/server/src/generation-jobs/generation-jobs.service.ts`**

```ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SeedanceService } from "../providers/seedance/seedance.service";

@Injectable()
export class GenerationJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seedanceService: SeedanceService
  ) {}

  async createJob(input: {
    clientId: string;
    templateVersionId: string;
    strategy: "single" | "extend" | "storyboard";
    script: string;
  }) {
    const prompt = `Create a video for: ${input.script}`;

    const providerResult = await this.seedanceService.createVideoTask({
      prompt,
      strategy: input.strategy
    });

    return this.prisma.generationJob.create({
      data: {
        clientId: input.clientId,
        templateVersionId: input.templateVersionId,
        strategy: input.strategy,
        script: input.script,
        status: "queued",
        attempts: {
          create: {
            attemptNumber: 1,
            providerName: "seedance",
            requestPayload: JSON.stringify(providerResult.rawRequest),
            responsePayload: JSON.stringify(providerResult.rawResponse),
            resultStatus: "accepted"
          }
        },
        scenes: {
          create: {
            sequenceIndex: 0,
            strategy: input.strategy,
            title: "Initial scene",
            prompt,
            status: "queued",
            providerTaskId: providerResult.providerTaskId
          }
        }
      },
      include: {
        scenes: true,
        attempts: true
      }
    });
  }
}
```

- [ ] **Step 4: Create `apps/server/src/generation-jobs/generation-jobs.controller.ts`**

```ts
import { Body, Controller, Post } from "@nestjs/common";
import { GenerationJobsService } from "./generation-jobs.service";

@Controller("generation-jobs")
export class GenerationJobsController {
  constructor(private readonly generationJobsService: GenerationJobsService) {}

  @Post()
  createJob(@Body() body: {
    clientId: string;
    templateVersionId: string;
    strategy: "single" | "extend" | "storyboard";
    script: string;
  }) {
    return this.generationJobsService.createJob(body);
  }
}
```

- [ ] **Step 5: Create `apps/server/src/generation-jobs/generation-jobs.module.ts`**

```ts
import { Module } from "@nestjs/common";
import { GenerationJobsController } from "./generation-jobs.controller";
import { GenerationJobsService } from "./generation-jobs.service";
import { SeedanceModule } from "../providers/seedance/seedance.module";

@Module({
  imports: [SeedanceModule],
  controllers: [GenerationJobsController],
  providers: [GenerationJobsService]
})
export class GenerationJobsModule {}
```

- [ ] **Step 6: Register `GenerationJobsModule` in `AppModule`**

```ts
imports: [PrismaModule, TemplatesModule, MediaAssetsModule, GenerationJobsModule]
```

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/generation-jobs apps/server/src/providers/seedance apps/server/src/app.module.ts
git commit -m "feat: add generation job creation flow with seedance adapter"
```

### Task 8: Scaffold Public Web App

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/index.css`

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@xvideo/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@xvideo/shared": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.2",
    "vite": "^6.0.3"
  }
}
```

- [ ] **Step 2: Create `apps/web/src/App.tsx`**

```tsx
export function App() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Seedance Video</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-tight">
            Tell us the story. We turn it into an AI video.
          </h1>
          <p className="max-w-2xl text-stone-300">
            Pick a template, add a rough script, upload reference images, and generate a usable video without prompt engineering.
          </p>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Create `apps/web/src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Create `apps/web/src/index.css`**

```css
@import "tailwindcss";

body {
  margin: 0;
  font-family: "IBM Plex Sans", sans-serif;
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: scaffold public web app"
```

### Task 9: Scaffold Admin App

**Files:**
- Create: `apps/admin/package.json`
- Create: `apps/admin/src/main.tsx`
- Create: `apps/admin/src/App.tsx`
- Create: `apps/admin/src/index.css`

- [ ] **Step 1: Create `apps/admin/package.json`**

```json
{
  "name": "@xvideo/admin",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "vite --port 3002",
    "build": "vite build"
  },
  "dependencies": {
    "@xvideo/shared": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.2",
    "vite": "^6.0.3"
  }
}
```

- [ ] **Step 2: Create `apps/admin/src/App.tsx`**

```tsx
export function App() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-4xl font-semibold">Template Admin Console</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Manage template versions, prompt rules, generation strategies, and provider behavior.
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Create `apps/admin/src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Create `apps/admin/src/index.css`**

```css
@import "tailwindcss";

body {
  margin: 0;
  font-family: "IBM Plex Sans", sans-serif;
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/admin
git commit -m "feat: scaffold admin app"
```

### Task 10: Connect Public Web App to Backend APIs

**Files:**
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/lib/api.ts`

- [ ] **Step 1: Create `apps/web/src/lib/api.ts`**

```ts
export async function fetchTemplates() {
  const response = await fetch("http://localhost:3001/api/templates");
  if (!response.ok) {
    throw new Error("Failed to load templates");
  }
  return response.json();
}
```

- [ ] **Step 2: Update `apps/web/src/App.tsx` to load templates**

```tsx
import { useEffect, useState } from "react";
import { fetchTemplates } from "./lib/api";

type Template = {
  id: string;
  name: string;
  description: string;
};

export function App() {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Seedance Video</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-tight">
            Tell us the story. We turn it into an AI video.
          </h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <article key={template.id} className="rounded-3xl border border-stone-800 p-5">
              <h2 className="text-xl font-medium">{template.name}</h2>
              <p className="mt-2 text-stone-400">{template.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/lib/api.ts
git commit -m "feat: connect public web app to template api"
```

### Task 11: Add Task Polling and MVP Result Flow

**Files:**
- Modify: `apps/server/src/generation-jobs/generation-jobs.controller.ts`
- Modify: `apps/server/src/generation-jobs/generation-jobs.service.ts`
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Add job fetch endpoint in `generation-jobs.controller.ts`**

```ts
import { Body, Controller, Get, Param, Post } from "@nestjs/common";

@Get(":id")
getJob(@Param("id") id: string) {
  return this.generationJobsService.getJob(id);
}
```

- [ ] **Step 2: Add `getJob` in `generation-jobs.service.ts`**

```ts
getJob(id: string) {
  return this.prisma.generationJob.findUnique({
    where: { id },
    include: { scenes: true, attempts: true }
  });
}
```

- [ ] **Step 3: Add API helpers in `apps/web/src/lib/api.ts`**

```ts
export async function createGenerationJob(payload: {
  clientId: string;
  templateVersionId: string;
  strategy: "single" | "extend" | "storyboard";
  script: string;
}) {
  const response = await fetch("http://localhost:3001/api/generation-jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Failed to create generation job");
  }

  return response.json();
}

export async function fetchGenerationJob(id: string) {
  const response = await fetch(`http://localhost:3001/api/generation-jobs/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch generation job");
  }
  return response.json();
}
```

- [ ] **Step 4: Update the public app to submit a basic job and display status**

Expected UI behavior:
- user can enter script text
- user can submit a generation job
- app displays returned job status

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/generation-jobs apps/web/src
git commit -m "feat: add generation job status flow"
```

### Task 12: Add Admin Template Management Basics

**Files:**
- Modify: `apps/admin/src/App.tsx`
- Create: `apps/admin/src/lib/api.ts`

- [ ] **Step 1: Create `apps/admin/src/lib/api.ts`**

```ts
export async function fetchTemplates() {
  const response = await fetch("http://localhost:3001/api/templates");
  if (!response.ok) {
    throw new Error("Failed to load templates");
  }
  return response.json();
}
```

- [ ] **Step 2: Update `apps/admin/src/App.tsx` to show template cards**

```tsx
import { useEffect, useState } from "react";
import { fetchTemplates } from "./lib/api";

type Template = {
  id: string;
  name: string;
  description: string;
  defaultStrategy: string;
};

export function App() {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-4xl font-semibold">Template Admin Console</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <article key={template.id} className="rounded-3xl border border-zinc-800 p-5">
              <h2 className="text-xl font-medium">{template.name}</h2>
              <p className="mt-2 text-zinc-400">{template.description}</p>
              <p className="mt-3 text-sm text-zinc-500">Default strategy: {template.defaultStrategy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src
git commit -m "feat: add admin template overview"
```

### Task 13: Add Seed Data and Local Run Instructions

**Files:**
- Create: `apps/server/prisma/seed.ts`
- Modify: `README.md`

- [ ] **Step 1: Create `apps/server/prisma/seed.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const template = await prisma.template.upsert({
    where: { slug: "product-seeding" },
    update: {},
    create: {
      name: "Product Seeding",
      slug: "product-seeding",
      description: "Simple promo template for product storytelling.",
      defaultStrategy: "single"
    }
  });

  await prisma.templateVersion.create({
    data: {
      templateId: template.id,
      versionNumber: 1,
      promptSkeleton: "Create a cinematic product video using the script and references.",
      inputSchemaJson: JSON.stringify([
        { key: "script", label: "Script", type: "textarea", required: true }
      ]),
      strategyJson: JSON.stringify({ allowed: ["single", "extend", "storyboard"] })
    }
  });
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Update `README.md` with local setup**

```md
## Local setup

1. Install dependencies: `pnpm install`
2. Set `DATABASE_URL=file:./dev.db`
3. Run Prisma generate: `pnpm --filter @xvideo/server exec prisma generate`
4. Push schema: `pnpm --filter @xvideo/server exec prisma db push`
5. Seed data: `pnpm --filter @xvideo/server exec ts-node prisma/seed.ts`
6. Start apps: `pnpm dev`
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/prisma/seed.ts README.md
git commit -m "docs: add local setup and seed data"
```

### Task 14: Verification Pass

**Files:**
- Test: workspace commands

- [ ] **Step 1: Install dependencies**

Run: `pnpm install`
Expected: workspace dependencies install successfully

- [ ] **Step 2: Generate Prisma client**

Run: `pnpm --filter @xvideo/server exec prisma generate`
Expected: Prisma client generated

- [ ] **Step 3: Push database schema**

Run: `DATABASE_URL=file:./dev.db pnpm --filter @xvideo/server exec prisma db push`
Expected: schema created successfully

- [ ] **Step 4: Seed database**

Run: `DATABASE_URL=file:./dev.db pnpm --filter @xvideo/server exec ts-node prisma/seed.ts`
Expected: template seed inserted successfully

- [ ] **Step 5: Start backend**

Run: `DATABASE_URL=file:./dev.db pnpm --filter @xvideo/server dev`
Expected: NestJS server starts on port 3001

- [ ] **Step 6: Start public app**

Run: `pnpm --filter @xvideo/web dev`
Expected: Vite app starts and loads template cards

- [ ] **Step 7: Start admin app**

Run: `pnpm --filter @xvideo/admin dev`
Expected: admin app starts on port 3002 and loads template cards

- [ ] **Step 8: Manual verification**

Verify:
- `/api/health` returns `{ ok: true }`
- `/api/templates` returns seeded template data
- public app renders template list
- admin app renders template list
- generation job POST creates a queued job with scene and attempt records

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "chore: verify seedance video mvp scaffold"
```
