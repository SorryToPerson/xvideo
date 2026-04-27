export async function fetchTemplates() {
  const response = await fetch("http://localhost:3001/api/templates");
  if (!response.ok) {
    throw new Error("Failed to load templates");
  }

  return response.json();
}
