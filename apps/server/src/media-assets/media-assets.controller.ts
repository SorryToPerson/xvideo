import { Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "node:path";
import { MediaAssetsService } from "./media-assets.service";

@Controller("media-assets")
export class MediaAssetsController {
  constructor(private readonly mediaAssetsService: MediaAssetsService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "apps/server/uploads",
        filename: (_req, file, callback) => {
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
          callback(null, uniqueName);
        }
      })
    })
  )
  async uploadReferenceImage(@UploadedFile() file: Express.Multer.File) {
    const storagePath = `apps/server/uploads/${file.filename}`;

    return this.mediaAssetsService.createUploadedAsset(
      file.originalname,
      file.mimetype,
      storagePath
    );
  }
}
