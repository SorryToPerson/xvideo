import { Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { MediaAssetsService } from "./media-assets.service";

@Controller("media-assets")
export class MediaAssetsController {
  constructor(private readonly mediaAssetsService: MediaAssetsService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024
      }
    })
  )
  async uploadReferenceImage(@UploadedFile() file: Express.Multer.File) {
    return this.mediaAssetsService.uploadReferenceImage(file);
  }
}
