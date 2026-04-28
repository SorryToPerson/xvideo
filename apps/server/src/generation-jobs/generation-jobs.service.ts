import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SeedanceService } from "../providers/seedance/seedance.service";

type GenerationStrategy = "single" | "extend" | "storyboard";

@Injectable()
export class GenerationJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seedanceService: SeedanceService
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

    const providerResult = await this.seedanceService.createVideoTask({
      prompt,
      strategy: input.strategy
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

  async getJob(id: string) {
    let job = await this.prisma.generationJob.findUnique({
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
    }

    await this.syncJobStatus(id);

    job = await this.prisma.generationJob.findUnique({
      where: { id },
      include: {
        scenes: true,
        attempts: true
      }
    });

    return job;
  }
}
