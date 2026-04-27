"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generationJobStatusSchema = exports.createGenerationRequestSchema = void 0;
const zod_1 = require("zod");
const video_template_1 = require("./video-template");
exports.createGenerationRequestSchema = zod_1.z.object({
    templateSlug: zod_1.z.string(),
    strategy: video_template_1.generationStrategySchema,
    script: zod_1.z.string().min(10),
    referenceImageIds: zod_1.z.array(zod_1.z.string()).max(3).default([]),
    clientId: zod_1.z.string()
});
exports.generationJobStatusSchema = zod_1.z.enum([
    "queued",
    "running",
    "succeeded",
    "failed"
]);
