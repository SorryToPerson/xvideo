import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { GenerationJobsService } from "./generation-jobs.service";

type GenerationStrategy = "single" | "extend" | "storyboard";

@Controller("generation-jobs")
export class GenerationJobsController {
  constructor(private readonly generationJobsService: GenerationJobsService) {}

  @Post()
  createJob(
    @Body()
    body: {
      clientId: string;
      templateVersionId: string;
      strategy: GenerationStrategy;
      script: string;
    }
  ) {
    return this.generationJobsService.createJob(body);
  }

  @Get(":id")
  getJob(@Param("id") id: string) {
    return this.generationJobsService.getJob(id);
  }
}
