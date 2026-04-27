import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MediaAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async createUploadedAsset(filename: string, mimeType: string, storagePath: string) {
    return this.prisma.mediaAsset.create({
      data: {
        kind: "reference-image",
        filename,
        mimeType,
        storagePath
      }
    });
  }
}
