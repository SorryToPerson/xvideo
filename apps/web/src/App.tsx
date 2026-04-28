import { useEffect, useState } from "react";
import {
  createGenerationJob,
  fetchGenerationJob,
  fetchTemplates,
  uploadReferenceImage
} from "./lib/api";

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
  scenes?: Array<{
    id: string;
    status: string;
    providerTaskId?: string | null;
    resultUrl?: string | null;
    providerError?: string | null;
  }>;
};

type UploadedReferenceImage = {
  id: string;
  filename: string;
  objectKey: string;
  url: string;
};

export function App() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [script, setScript] = useState(
    "A premium skin-care bottle on a stone counter, morning sunlight, calm cinematic motion."
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedReferenceImage[]>([]);

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

  useEffect(() => {
    if (!job?.id || !["queued", "running"].includes(job.status)) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const nextJob = await fetchGenerationJob(job.id);
        setJob(nextJob);
      } catch (pollError) {
        const message =
          pollError instanceof Error ? pollError.message : "Failed to refresh job status.";
        setError(message);
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [job?.id, job?.status]);

  async function handleReferenceImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;

    if (!fileList?.length) {
      return;
    }

    const selectedFiles = Array.from(fileList).slice(0, 3 - uploadedImages.length);

    if (!selectedFiles.length) {
      setError("You can upload up to 3 reference images.");
      return;
    }

    try {
      setError("");
      setIsUploading(true);

      const results = await Promise.all(selectedFiles.map((file) => uploadReferenceImage(file)));
      setUploadedImages((current) => [...current, ...results].slice(0, 3));
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload one or more reference images.";
      setError(message);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function removeUploadedImage(id: string) {
    setUploadedImages((current) => current.filter((image) => image.id !== id));
  }

  async function handleSubmit() {
    const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);
    const templateVersionId = selectedTemplate?.versions?.[0]?.id;

    if (!templateVersionId) {
      setError("No template version is available yet.");
      return;
    }

    try {
      setError("");
      setIsSubmitting(true);
      const result = await createGenerationJob({
        clientId: "browser-mvp-client",
        templateVersionId,
        strategy: selectedTemplate.defaultStrategy,
        script,
        referenceImageIds: uploadedImages.map((image) => image.id)
      });
      setJob(result);
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "Failed to create generation job.";
      setError(message);
    } finally {
      setIsSubmitting(false);
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
            Pick a template, add a rough script, upload up to three reference images, and generate a usable video without prompt engineering.
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
          <div>
            <label className="block text-sm uppercase tracking-[0.2em] text-stone-400">
              Reference Images
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-200 transition hover:border-amber-300 hover:text-amber-200">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleReferenceImageChange}
                  className="hidden"
                  disabled={isUploading || uploadedImages.length >= 3}
                />
                {isUploading ? "Uploading..." : "Upload Images"}
              </label>
              <p className="text-sm text-stone-500">
                {uploadedImages.length}/3 uploaded
              </p>
            </div>

            {uploadedImages.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {uploadedImages.map((image) => (
                  <article
                    key={image.id}
                    className="rounded-2xl border border-stone-800 bg-stone-950/70 p-3"
                  >
                    <img
                      src={image.url}
                      alt={image.filename}
                      className="h-28 w-full rounded-xl object-cover"
                    />
                    <p className="mt-3 truncate text-sm text-stone-300">{image.filename}</p>
                    <button
                      type="button"
                      onClick={() => removeUploadedImage(image.id)}
                      className="mt-2 text-xs text-rose-300"
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-stone-500">
                Upload product photos, character references, or style images to guide generation.
              </p>
            )}
          </div>

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
              disabled={isSubmitting || isUploading}
              className="rounded-full bg-amber-300 px-5 py-3 font-medium text-stone-950"
            >
              {isSubmitting ? "Generating..." : "Generate Video"}
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
            {job.scenes?.[0]?.resultUrl ? (
              <a
                href={job.scenes[0].resultUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm text-amber-300"
              >
                Open Generated Video
              </a>
            ) : null}
            {job.scenes?.[0]?.providerError ? (
              <p className="mt-3 text-sm text-rose-300">{job.scenes[0].providerError}</p>
            ) : null}
            {["queued", "running"].includes(job.status) ? (
              <p className="mt-3 text-sm text-stone-500">
                We are checking task status automatically every 5 seconds.
              </p>
            ) : null}
          </section>
        ) : null}
      </section>
    </main>
  );
}
