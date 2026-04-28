import { Injectable } from "@nestjs/common";
import { MediaAssetsService } from "../media-assets/media-assets.service";
import { PrismaService } from "../prisma/prisma.service";
import { SeedanceService } from "../providers/seedance/seedance.service";

type GenerationStrategy = "single" | "extend" | "storyboard";

@Injectable()
export class GenerationJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seedanceService: SeedanceService,
    private readonly mediaAssetsService: MediaAssetsService
  ) {}

  async createJob(input: {
    clientId: string;
    templateVersionId: string;
    strategy: GenerationStrategy;
    script: string;
    referenceImageIds?: string[];
  }) {
    const prompt = `Create a video for: ${input.script}`;
    const referenceImageIds = input.referenceImageIds ?? [];
    const referenceAssets = referenceImageIds.length
      ? await this.prisma.mediaAsset.findMany({
          where: {
            id: { in: referenceImageIds }
          }
        })
      : [];

    const referenceImageUrls = referenceAssets.map((asset) =>
      this.mediaAssetsService.getSignedAssetUrl(asset.storagePath)
    );

    const providerResult = await this.seedanceService.createVideoTask({
      prompt,
      strategy: input.strategy,
      referenceImageUrls
    });

    return this.prisma.generationJob.create({
      data: {
        clientId: input.clientId,
        templateVersionId: input.templateVersionId,
        strategy: input.strategy,
        script: input.script,
        status: "queued",
        attempts: {
          create: {
            attemptNumber: 1,
            providerName: "seedance",
            requestPayload: JSON.stringify({
              ...providerResult.rawRequest,
              referenceImageIds
            }),
            responsePayload: JSON.stringify(providerResult.rawResponse),
            resultStatus: "accepted"
          }
        },
        scenes: {
          create: {
            sequenceIndex: 0,
            strategy: input.strategy,
            title: "Initial scene",
            prompt,
            status: "queued",
            providerTaskId: providerResult.providerTaskId,
            resultUrl: providerResult.rawResponse?.content?.video_url ?? null
          }
        }
      },
      include: {
        scenes: true,
        attempts: true
      }
    });
  }

  private mapProviderStatus(status?: string) {
    switch (status) {
      case "queued":
      case "pending":
        return "queued";
      case "running":
      case "processing":
        return "running";
      case "succeeded":
        return "succeeded";
      case "failed":
      case "canceled":
        return "failed";
      default:
        return "running";
    }
  }

  private async syncSceneStatus(sceneId: string, providerTaskId: string) {
    const providerTask = await this.seedanceService.getVideoTask(providerTaskId);
    const normalizedStatus = this.mapProviderStatus(providerTask.status);

    return this.prisma.generationScene.update({
      where: { id: sceneId },
      data: {
        status: normalizedStatus,
        resultUrl: providerTask.content?.video_url ?? null,
        providerError: providerTask.error
          ? JSON.stringify(providerTask.error)
          : normalizedStatus === "failed"
            ? "Seedance task failed."
            : null
      }
    });
  }

  private async persistFinalSceneVideo(jobId: string, sceneId: string, providerVideoUrl: string) {
    const job = await this.prisma.generationJob.findUnique({
      where: { id: jobId }
    });

    if (job?.finalVideoId) {
      const finalVideo = await this.prisma.generatedVideo.findUnique({
        where: { id: job.finalVideoId }
      });

      if (finalVideo) {
        return this.prisma.generationScene.update({
          where: { id: sceneId },
          data: {
            resultUrl: this.mediaAssetsService.getSignedAssetUrl(finalVideo.storagePath)
          }
        });
      }
    }

    const uploadedVideo = await this.mediaAssetsService.uploadRemoteVideo(providerVideoUrl);

    await this.prisma.generationJob.update({
      where: { id: jobId },
      data: {
        finalVideoId: uploadedVideo.generatedVideo.id
      }
    });

    return this.prisma.generationScene.update({
      where: { id: sceneId },
      data: {
        resultUrl: uploadedVideo.url
      }
    });
  }

  private async syncJobStatus(jobId: string) {
    const scenes = await this.prisma.generationScene.findMany({
      where: { jobId },
      orderBy: { sequenceIndex: "asc" }
    });

    let nextStatus = "queued";

    if (scenes.some((scene) => scene.status === "failed")) {
      nextStatus = "failed";
    } else if (scenes.every((scene) => scene.status === "succeeded")) {
      nextStatus = "succeeded";
    } else if (scenes.some((scene) => scene.status === "running")) {
      nextStatus = "running";
    }

    await this.prisma.generationJob.update({
      where: { id: jobId },
      data: { status: nextStatus }
    });
  }

  private async formatJobResponse(id: string) {
    const job = await this.prisma.generationJob.findUnique({
      where: { id },
      include: {
        scenes: {
          orderBy: { sequenceIndex: "asc" }
        },
        attempts: true,
        finalVideo: true
      }
    });

    if (!job) {
      return null;
    }

    const primaryScene = job.scenes[0] ?? null;
    const finalVideo = job.finalVideo
      ? {
          id: job.finalVideo.id,
          storagePath: job.finalVideo.storagePath,
          sourceUrl: job.finalVideo.sourceUrl,
          url: this.mediaAssetsService.getSignedAssetUrl(job.finalVideo.storagePath)
        }
      : null;

    return {
      ...job,
      primaryScene,
      providerTaskId: primaryScene?.providerTaskId ?? null,
      resultUrl: finalVideo?.url ?? primaryScene?.resultUrl ?? null,
      finalVideo
    };
  }

  async getJob(id: string) {
    const job = await this.prisma.generationJob.findUnique({
      where: { id },
      include: {
        scenes: true,
        attempts: true
      }
    });

    if (!job) {
      return null;
    }

    for (const scene of job.scenes) {
      if (scene.providerTaskId && !["succeeded", "failed"].includes(scene.status)) {
        try {
          await this.syncSceneStatus(scene.id, scene.providerTaskId);
        } catch {
          // Keep the job readable even if provider sync temporarily fails.
        }
      }

      if (scene.status === "succeeded" && scene.resultUrl?.startsWith("http")) {
        try {
          await this.persistFinalSceneVideo(job.id, scene.id, scene.resultUrl);
        } catch {
          // Keep the job readable even if COS persistence temporarily fails.
        }
      }
    }

    await this.syncJobStatus(id);

    return this.formatJobResponse(id);
  }
}
