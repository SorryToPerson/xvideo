import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string(),
  ARK_API_KEY: z.string().optional(),
  SEEDANCE_API_KEY: z.string().optional(),
  ARK_BASE_URL: z.string().optional(),
  SEEDANCE_BASE_URL: z.string().optional(),
  SEEDANCE_MODEL: z.string().optional(),
  SEEDANCE_TASK_PATH: z.string().optional()
});
