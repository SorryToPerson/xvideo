import { useEffect, useState } from "react";
import { fetchTemplates } from "./lib/api";

type Template = {
  id: string;
  name: string;
  description: string;
  defaultStrategy: string;
};

export function App() {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-4xl font-semibold">Template Admin Console</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Manage template versions, prompt rules, generation strategies, and provider behavior.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <article key={template.id} className="rounded-3xl border border-zinc-800 p-5">
              <h2 className="text-xl font-medium">{template.name}</h2>
              <p className="mt-2 text-zinc-400">{template.description}</p>
              <p className="mt-3 text-sm text-zinc-500">
                Default strategy: {template.defaultStrategy}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
