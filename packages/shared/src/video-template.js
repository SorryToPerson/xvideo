"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateSummarySchema = exports.templateInputFieldSchema = exports.generationStrategySchema = void 0;
const zod_1 = require("zod");
exports.generationStrategySchema = zod_1.z.enum(["single", "extend", "storyboard"]);
exports.templateInputFieldSchema = zod_1.z.object({
    key: zod_1.z.string(),
    label: zod_1.z.string(),
    type: zod_1.z.enum(["text", "textarea", "select"]),
    required: zod_1.z.boolean(),
    helpText: zod_1.z.string().optional()
});
exports.templateSummarySchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    slug: zod_1.z.string(),
    description: zod_1.z.string(),
    defaultStrategy: exports.generationStrategySchema
});
