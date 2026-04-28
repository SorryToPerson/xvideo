async function parseErrorMessage(response: Response, fallbackMessage: string) {
  try {
    const payload = await response.json();
    const message = payload?.message;

    return typeof message === "string" && message.length ? message : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function fetchTemplates() {
  const response = await fetch("http://localhost:3001/api/templates");
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "加载模板失败"));
  }

  return response.json();
}

export async function updateTemplate(
  id: string,
  payload: {
    name: string;
    description: string;
    defaultStrategy: "single" | "extend" | "storyboard";
  }
) {
  const response = await fetch(`http://localhost:3001/api/templates/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "更新模板失败"));
  }

  return response.json();
}
