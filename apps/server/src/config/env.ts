import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string(),
  SEEDANCE_API_KEY: z.string().optional(),
  SEEDANCE_BASE_URL: z.string().optional()
});
