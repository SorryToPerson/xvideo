import { BadRequestException, Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { z } from "zod";
import { TemplatesService } from "./templates.service";

const updateTemplateSchema = z.object({
  name: z.string().trim().min(1, "模板名称不能为空"),
  description: z.string().trim().min(1, "模板描述不能为空"),
  defaultStrategy: z.enum(["single", "extend", "storyboard"])
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
}
