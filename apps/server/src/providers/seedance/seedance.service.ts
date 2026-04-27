import { Injectable } from "@nestjs/common";

type GenerationStrategy = "single" | "extend" | "storyboard";

export type SeedanceCreateTaskInput = {
  prompt: string;
  strategy: GenerationStrategy;
};

@Injectable()
export class SeedanceService {
  async createVideoTask(input: SeedanceCreateTaskInput) {
    return {
      providerTaskId: `mock-${Date.now()}`,
      rawRequest: input,
      rawResponse: { accepted: true }
    };
  }
}
