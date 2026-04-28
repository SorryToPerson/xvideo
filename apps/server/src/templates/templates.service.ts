import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  listTemplates() {
    return this.prisma.template.findMany({
      include: {
        versions: {
          orderBy: { versionNumber: "desc" }
        }
      },
      orderBy: { createdAt: "asc" }
    });
  }

  updateTemplate(
    id: string,
    input: {
      name: string;
      description: string;
      defaultStrategy: "single" | "extend" | "storyboard";
    }
  ) {
    return this.prisma.template.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        defaultStrategy: input.defaultStrategy
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" }
        }
      }
    });
  }

  async createTemplateVersion(
    templateId: string,
    input: {
      promptSkeleton: string;
      inputSchemaJson: string;
      strategyJson: string;
    }
  ) {
    const latestVersion = await this.prisma.templateVersion.findFirst({
      where: { templateId },
      orderBy: { versionNumber: "desc" }
    });

    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    await this.prisma.templateVersion.create({
      data: {
        templateId,
        versionNumber: nextVersionNumber,
        promptSkeleton: input.promptSkeleton,
        inputSchemaJson: input.inputSchemaJson,
        strategyJson: input.strategyJson
      }
    });

    return this.prisma.template.findUnique({
      where: { id: templateId },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" }
        }
      }
    });
  }
}
