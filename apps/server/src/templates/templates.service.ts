import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  listTemplates() {
    return this.prisma.template.findMany({
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1
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
          orderBy: { versionNumber: "desc" },
          take: 1
        }
      }
    });
  }
}
