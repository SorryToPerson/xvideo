import { Injectable, InternalServerErrorException } from "@nestjs/common";

type GenerationStrategy = "single" | "extend" | "storyboard";

export type SeedanceCreateTaskInput = {
  prompt: string;
  strategy: GenerationStrategy;
};

export type SeedanceTaskResponse = {
  id: string;
  status?: string;
  content?: {
    video_url?: string;
  };
  error?: unknown;
};

@Injectable()
export class SeedanceService {
  private readonly apiKey =
    process.env.ARK_API_KEY ?? process.env.SEEDANCE_API_KEY ?? "";

  private readonly baseUrl =
    process.env.ARK_BASE_URL ??
    process.env.SEEDANCE_BASE_URL ??
    "https://ark.cn-beijing.volces.com/api/v3";

  private readonly model = process.env.SEEDANCE_MODEL ?? "";

  private readonly taskPath =
    process.env.SEEDANCE_TASK_PATH ?? "/contents/generations/tasks";

  private assertConfigured() {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        "Seedance is not configured. Set ARK_API_KEY or SEEDANCE_API_KEY."
      );
    }

    if (!this.model) {
      throw new InternalServerErrorException(
        "Seedance is not configured. Set SEEDANCE_MODEL to your Ark endpoint ID or video model ID."
      );
    }
  }

  private buildUrl(taskId?: string) {
    const normalizedBaseUrl = this.baseUrl.replace(/\/$/, "");
    const normalizedTaskPath = this.taskPath.startsWith("/")
      ? this.taskPath
      : `/${this.taskPath}`;

    return taskId
      ? `${normalizedBaseUrl}${normalizedTaskPath}/${taskId}`
      : `${normalizedBaseUrl}${normalizedTaskPath}`;
  }

  private async parseResponse(response: Response) {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return text;
    }
  }

  async createVideoTask(input: SeedanceCreateTaskInput) {
    this.assertConfigured();

    const requestBody = {
      model: this.model,
      content: [{ type: "text", text: input.prompt }]
    };

    const response = await fetch(this.buildUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const rawResponse = await this.parseResponse(response);

    if (!response.ok || !rawResponse?.id) {
      throw new InternalServerErrorException({
        message: "Seedance task creation failed",
        status: response.status,
        response: rawResponse
      });
    }

    return {
      providerTaskId: rawResponse.id as string,
      rawRequest: requestBody,
      rawResponse
    };
  }

  async getVideoTask(taskId: string) {
    this.assertConfigured();

    const response = await fetch(this.buildUrl(taskId), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      }
    });

    const rawResponse = (await this.parseResponse(response)) as SeedanceTaskResponse;

    if (!response.ok) {
      throw new InternalServerErrorException({
        message: "Seedance task query failed",
        status: response.status,
        response: rawResponse
      });
    }

    return rawResponse;
  }
}
