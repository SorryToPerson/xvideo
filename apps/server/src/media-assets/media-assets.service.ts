import { Injectable, InternalServerErrorException } from "@nestjs/common";
import COS from "cos-nodejs-sdk-v5";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MediaAssetsService {
  private readonly cosUploadMode = process.env.COS_UPLOAD_MODE ?? "server";
  private readonly bucket = process.env.COS_BUCKET ?? "";
  private readonly region = process.env.COS_REGION ?? "";
  private readonly referencePrefix =
    process.env.COS_PATH_PREFIX_REFERENCE ?? "reference-images";
  private readonly videoPrefix =
    process.env.COS_PATH_PREFIX_VIDEO ?? "generated-videos";

  private readonly cos =
    process.env.COS_SECRET_ID && process.env.COS_SECRET_KEY
      ? new COS({
          SecretId: process.env.COS_SECRET_ID,
          SecretKey: process.env.COS_SECRET_KEY
        })
      : null;

  constructor(private readonly prisma: PrismaService) {}

  private assertCosConfigured() {
    if (this.cosUploadMode !== "server") {
      throw new InternalServerErrorException(
        `Unsupported COS upload mode: ${this.cosUploadMode}`
      );
    }

    if (!this.cos || !this.bucket || !this.region) {
      throw new InternalServerErrorException(
        "COS is not configured. Check COS credentials, bucket, and region."
      );
    }
  }

  private buildReferenceKey(filename: string) {
    const extension = extname(filename) || "";
    return `${this.referencePrefix}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
  }

  private buildVideoKey(filename: string) {
    const extension = extname(filename) || ".mp4";
    return `${this.videoPrefix}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
  }

  private async putObject(key: string, file: Express.Multer.File) {
    this.assertCosConfigured();

    return new Promise<void>((resolve, reject) => {
      this.cos!.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype
        },
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        }
      );
    });
  }

  private createAccessibleUrl(key: string) {
    this.assertCosConfigured();

    return this.cos!.getObjectUrl({
      Bucket: this.bucket,
      Region: this.region,
      Key: key,
      Sign: true,
      Expires: 60 * 60
    });
  }

  getSignedAssetUrl(storagePath: string) {
    return this.createAccessibleUrl(storagePath);
  }

  async uploadRemoteVideo(sourceUrl: string) {
    const response = await fetch(sourceUrl);

    if (!response.ok) {
      throw new InternalServerErrorException({
        message: "Failed to download generated video from provider",
        status: response.status
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "video/mp4";
    const urlPathname = new URL(sourceUrl).pathname;
    const originalFilename = urlPathname.split("/").pop() || "generated-video.mp4";
    const storagePath = this.buildVideoKey(originalFilename);

    try {
      await new Promise<void>((resolve, reject) => {
        this.cos!.putObject(
          {
            Bucket: this.bucket,
            Region: this.region,
            Key: storagePath,
            Body: Buffer.from(arrayBuffer),
            ContentType: contentType
          },
          (error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          }
        );
      });
    } catch (error) {
      throw new InternalServerErrorException({
        message: "Failed to upload generated video to COS",
        error
      });
    }

    const generatedVideo = await this.prisma.generatedVideo.create({
      data: {
        storagePath,
        sourceUrl
      }
    });

    return {
      generatedVideo,
      url: this.createAccessibleUrl(storagePath)
    };
  }

  async createUploadedAsset(
    filename: string,
    mimeType: string,
    storagePath: string
  ) {
    return this.prisma.mediaAsset.create({
      data: {
        kind: "reference-image",
        filename,
        mimeType,
        storagePath
      }
    });
  }

  async uploadReferenceImage(file: Express.Multer.File) {
    const storagePath = this.buildReferenceKey(file.originalname);

    try {
      await this.putObject(storagePath, file);
    } catch (error) {
      throw new InternalServerErrorException({
        message: "COS upload failed",
        error
      });
    }

    const asset = await this.createUploadedAsset(
      file.originalname,
      file.mimetype,
      storagePath
    );

    return {
      ...asset,
      objectKey: storagePath,
      url: this.createAccessibleUrl(storagePath)
    };
  }
}
