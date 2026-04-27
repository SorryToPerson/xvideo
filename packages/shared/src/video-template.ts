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
