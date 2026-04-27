import { useEffect, useState } from "react";
import { createGenerationJob, fetchTemplates } from "./lib/api";

type Template = {
  id: string;
  name: string;
  description: string;
  defaultStrategy: "single" | "extend" | "storyboard";
  versions?: Array<{ id: string }>;
};

type Job = {
  id: string;
  status: string;
  scenes?: Array<{ id: string; status: string; providerTaskId?: string | null }>;
};

export function App() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [script, setScript] = useState(
    "A premium skin-care bottle on a stone counter, morning sunlight, calm cinematic motion."
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTemplates()
      .then((data: Template[]) => {
        setTemplates(data);
        if (data[0]) {
          setSelectedTemplateId(data[0].id);
        }
      })
      .catch(() => setTemplates([]));
  }, []);

  async function handleSubmit() {
    const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);
    const templateVersionId = selectedTemplate?.versions?.[0]?.id;

    if (!templateVersionId) {
      setError("No template version is available yet.");
      return;
    }

    try {
      setError("");
      const result = await createGenerationJob({
        clientId: "browser-mvp-client",
        templateVersionId,
        strategy: selectedTemplate.defaultStrategy,
        script
      });
      setJob(result);
    } catch {
      setError("Failed to create generation job.");
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Seedance Video</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-tight">
            Tell us the story. We turn it into an AI video.
          </h1>
          <p className="max-w-2xl text-stone-300">
            Pick a template, add a rough script, upload reference images later, and generate a usable video without prompt engineering.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelectedTemplateId(template.id)}
              className={`rounded-3xl border p-5 text-left ${
                selectedTemplateId === template.id
                  ? "border-amber-300 bg-amber-300/10"
                  : "border-stone-800"
              }`}
            >
              <h2 className="text-xl font-medium">{template.name}</h2>
              <p className="mt-2 text-stone-400">{template.description}</p>
            </button>
          ))}
        </div>

        <div className="rounded-[2rem] border border-stone-800 bg-stone-900/70 p-6">
          <label className="block text-sm uppercase tracking-[0.2em] text-stone-400">
            Rough Script
          </label>
          <textarea
            value={script}
            onChange={(event) => setScript(event.target.value)}
            className="mt-3 min-h-40 w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-stone-100 outline-none"
          />
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-full bg-amber-300 px-5 py-3 font-medium text-stone-950"
            >
              Generate Video
            </button>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>
        </div>

        {job ? (
          <section className="rounded-[2rem] border border-stone-800 p-6">
            <h3 className="text-lg font-medium">Latest Job</h3>
            <p className="mt-3 text-stone-300">Status: {job.status}</p>
            <p className="text-sm text-stone-500">Job ID: {job.id}</p>
            {job.scenes?.[0]?.providerTaskId ? (
              <p className="mt-2 text-sm text-stone-500">
                Provider task: {job.scenes[0].providerTaskId}
              </p>
            ) : null}
          </section>
        ) : null}
      </section>
    </main>
  );
}
