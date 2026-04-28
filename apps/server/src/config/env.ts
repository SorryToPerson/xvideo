import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string(),
  ARK_API_KEY: z.string().optional(),
  SEEDANCE_API_KEY: z.string().optional(),
  ARK_BASE_URL: z.string().optional(),
  SEEDANCE_BASE_URL: z.string().optional(),
  SEEDANCE_MODEL: z.string().optional(),
  SEEDANCE_TASK_PATH: z.string().optional(),
  COS_SECRET_ID: z.string().optional(),
  COS_SECRET_KEY: z.string().optional(),
  COS_BUCKET: z.string().optional(),
  COS_REGION: z.string().optional(),
  COS_PUBLIC_BASE_URL: z.string().optional(),
  COS_UPLOAD_MODE: z.string().optional(),
  COS_PATH_PREFIX_REFERENCE: z.string().optional(),
  COS_PATH_PREFIX_VIDEO: z.string().optional(),
  COS_PATH_PREFIX_POSTER: z.string().optional()
});

function parseEnvFile(filePath: string) {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function loadLocalEnvFile() {
  const candidatePaths = [
    resolve(process.cwd(), "src/.env"),
    resolve(process.cwd(), ".env"),
    resolve(__dirname, "../.env"),
    resolve(__dirname, ".env")
  ];

  for (const filePath of candidatePaths) {
    if (existsSync(filePath)) {
      parseEnvFile(filePath);
      return filePath;
    }
  }

  return null;
}
