export async function fetchTemplates() {
  const response = await fetch("http://localhost:3001/api/templates");
  if (!response.ok) {
    throw new Error("加载模板失败");
  }

  return response.json();
}
