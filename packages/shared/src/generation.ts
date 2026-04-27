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
