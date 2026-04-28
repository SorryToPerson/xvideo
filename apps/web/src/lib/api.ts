import type { GenerationStrategy } from "@xvideo/shared";

async function parseErrorMessage(response: Response, fallbackMessage: string) {
  try {
    const payload = await response.json();

    const modelMessage =
      payload?.response?.error?.message ??
      payload?.error?.message ??
      payload?.message;

    return typeof modelMessage === "string" && modelMessage.length
      ? modelMessage
      : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function fetchTemplates() {
  const response = await fetch("http://localhost:3001/api/templates");
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Failed to load templates"));
  }

  return response.json();
}

export async function createGenerationJob(payload: {
  clientId: string;
  templateVersionId: string;
  strategy: GenerationStrategy;
  script: string;
  referenceImageIds?: string[];
}) {
  const response = await fetch("http://localhost:3001/api/generation-jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Failed to create generation job"));
  }

  return response.json();
}

export async function uploadReferenceImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("http://localhost:3001/api/media-assets/upload", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Failed to upload reference image"));
  }

  return response.json() as Promise<{
    id: string;
    filename: string;
    objectKey: string;
    url: string;
  }>;
}

export async function fetchGenerationJob(id: string) {
  const response = await fetch(`http://localhost:3001/api/generation-jobs/${id}`);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Failed to fetch generation job"));
  }

  return response.json();
}
