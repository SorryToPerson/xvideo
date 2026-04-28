import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { z } from "zod";
import { TemplatesService } from "./templates.service";

const updateTemplateSchema = z.object({
  name: z.string().trim().min(1, "模板名称不能为空"),
  description: z.string().trim().min(1, "模板描述不能为空"),
  defaultStrategy: z.enum(["single", "extend", "storyboard"])
});

const createTemplateVersionSchema = z.object({
  promptSkeleton: z.string().trim().min(1, "Prompt 骨架不能为空"),
  inputSchemaJson: z.string().trim().min(1, "输入结构 JSON 不能为空"),
  strategyJson: z.string().trim().min(1, "策略 JSON 不能为空")
});

@Controller("templates")
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  listTemplates() {
    return this.templatesService.listTemplates();
  }

  @Patch(":id")
  updateTemplate(@Param("id") id: string, @Body() body: unknown) {
    const parsed = updateTemplateSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      throw new BadRequestException(firstIssue?.message ?? "模板更新参数不合法");
    }

    return this.templatesService.updateTemplate(id, parsed.data);
  }

  @Post(":id/versions")
  createTemplateVersion(@Param("id") id: string, @Body() body: unknown) {
    const parsed = createTemplateVersionSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      throw new BadRequestException(firstIssue?.message ?? "模板版本参数不合法");
    }

    try {
      JSON.parse(parsed.data.inputSchemaJson);
    } catch {
      throw new BadRequestException("输入结构 JSON 不是合法的 JSON");
    }

    try {
      JSON.parse(parsed.data.strategyJson);
    } catch {
      throw new BadRequestException("策略 JSON 不是合法的 JSON");
    }

    return this.templatesService.createTemplateVersion(id, parsed.data);
  }
}
