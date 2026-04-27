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
  }) {
    const prompt = `Create a video for: ${input.script}`;

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
            requestPayload: JSON.stringify(providerResult.rawRequest),
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
            providerTaskId: providerResult.providerTaskId
          }
        }
      },
      include: {
        scenes: true,
        attempts: true
      }
    });
  }

  getJob(id: string) {
    return this.prisma.generationJob.findUnique({
      where: { id },
      include: {
        scenes: true,
        attempts: true
      }
    });
  }
}
