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
}
