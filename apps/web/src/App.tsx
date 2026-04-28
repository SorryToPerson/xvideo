import { useEffect, useMemo, useState } from "react";
import type { GenerationStrategy } from "@xvideo/shared";
import {
  createGenerationJob,
  fetchGenerationJob,
  fetchTemplates,
  uploadReferenceImage
} from "./lib/api";

type Template = {
  id: string;
  slug?: string;
  name: string;
  description: string;
  defaultStrategy: GenerationStrategy;
  versions?: Array<{ id: string }>;
};

type Job = {
  id: string;
  status: string;
  providerTaskId?: string | null;
  resultUrl?: string | null;
  finalVideo?: {
    id: string;
    storagePath: string;
    sourceUrl?: string | null;
    url: string;
  } | null;
  primaryScene?: {
    id: string;
    status: string;
    providerTaskId?: string | null;
    resultUrl?: string | null;
    providerError?: string | null;
  } | null;
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

type BriefPreset = {
  label: string;
  subject: string;
  scene: string;
  tone: string;
  audience: string;
  hook: string;
  details: string;
};

type RecentJob = {
  id: string;
  templateName: string;
  status: string;
  scriptPreview: string;
  resultUrl?: string | null;
  updatedAt: string;
};

const recentJobsStorageKey = "xvideo-recent-jobs";

const templateTextMap: Record<string, { name: string; description: string }> = {
  "product-seeding": {
    name: "产品种草短片",
    description: "适合普通用户快速制作产品展示和种草类短视频。"
  }
};

const briefPresets: BriefPreset[] = [
  {
    label: "产品种草",
    subject: "一瓶极简高级感的护肤精华",
    scene: "清晨阳光洒在石材台面上，梳妆台环境干净通透",
    tone: "高级、平静、杂志感",
    audience: "22 到 35 岁、喜欢精致生活方式内容的女性用户",
    hook: "先用阳光打亮产品主镜头，再展示质地和使用动作",
    details: "结尾停在一个安静但有质感的产品英雄镜头上。"
  },
  {
    label: "城市氛围",
    subject: "一位年轻旅人在黄昏时分探索上海",
    scene: "楼顶视角、江边灯光、街道倒影和高架列车运动",
    tone: "电影感、梦幻、有节奏",
    audience: "短视频平台上的旅行和生活方式观众",
    hook: "先从城市大景和运动感切入，再推进到更私人的人物瞬间",
    details: "整体节奏保持顺滑轻盈，情绪上带一点向上的松弛感。"
  },
  {
    label: "剧情短片",
    subject: "一个女孩收到一台旧相机，开始拍摄雨夜街道",
    scene: "夜雨、店铺暖光、水洼倒影和贴近人物的手持感",
    tone: "情绪化、怀旧、胶片感",
    audience: "喜欢剧情感和强视觉表达短片的观众",
    hook: "从相机交接开始，再逐步展开像记忆一样的街道画面",
    details: "结尾保留一个轻微的情绪落点，不做明显商业化收尾。"
  }
];

const statusSteps = [
  { key: "draft", label: "填写创意描述" },
  { key: "upload", label: "添加参考图" },
  { key: "queued", label: "排队中" },
  { key: "running", label: "生成中" },
  { key: "succeeded", label: "已完成" }
] as const;

function getStatusTone(status: string) {
  switch (status) {
    case "succeeded":
      return "text-emerald-300";
    case "failed":
      return "text-rose-300";
    case "running":
      return "text-amber-200";
    default:
      return "text-stone-300";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "queued":
      return "排队中";
    case "running":
      return "生成中";
    case "succeeded":
      return "已完成";
    case "failed":
      return "失败";
    default:
      return "待开始";
  }
}

function buildScriptFromFields(input: {
  subject: string;
  scene: string;
  tone: string;
  audience: string;
  hook: string;
  details: string;
}) {
  return [
    `主体：${input.subject.trim()}`,
    `场景：${input.scene.trim()}`,
    `风格：${input.tone.trim()}`,
    `目标受众：${input.audience.trim()}`,
    `核心画面顺序：${input.hook.trim()}`,
    `补充要求：${input.details.trim()}`
  ]
    .filter((line) => !line.endsWith(":"))
    .join(". ");
}

function loadRecentJobs() {
  if (typeof window === "undefined") {
    return [] as RecentJob[];
  }

  try {
    const stored = window.localStorage.getItem(recentJobsStorageKey);
    if (!stored) {
      return [] as RecentJob[];
    }

    const parsed = JSON.parse(stored) as RecentJob[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as RecentJob[];
  }
}

function persistRecentJobs(jobs: RecentJob[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(recentJobsStorageKey, JSON.stringify(jobs.slice(0, 6)));
}

function getTemplateDisplay(template: Template) {
  const mapped =
    templateTextMap[template.slug ?? ""] ??
    templateTextMap[template.id] ??
    templateTextMap[template.name];

  if (mapped) {
    return mapped;
  }

  return {
    name: template.name,
    description: template.description
  };
}

export function App() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [strategyOverride, setStrategyOverride] = useState<GenerationStrategy | "">("");
  const [subject, setSubject] = useState("一瓶高级感护肤产品");
  const [scene, setScene] = useState("清晨阳光照在石材台面上，镜头缓慢推进，整体有电影感。");
  const [tone, setTone] = useState("高级、平静、精致");
  const [audience, setAudience] = useState("关注美妆和生活方式的短视频用户");
  const [hook, setHook] = useState("先展示产品主镜头，再展示质地特写，最后补一个自然使用场景。");
  const [details, setDetails] = useState("整体运动保持柔和，最后一帧要干净、有高级感。");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedReferenceImage[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates]
  );

  const effectiveStrategy = strategyOverride || selectedTemplate?.defaultStrategy || "single";
  const composedScript = useMemo(
    () =>
      buildScriptFromFields({
        subject,
        scene,
        tone,
        audience,
        hook,
        details
      }),
    [audience, details, hook, scene, subject, tone]
  );

  useEffect(() => {
    setRecentJobs(loadRecentJobs());

    fetchTemplates()
      .then((data: Template[]) => {
        setTemplates(data);
        if (data[0]) {
          setSelectedTemplateId(data[0].id);
          setStrategyOverride(data[0].defaultStrategy);
        }
      })
      .catch(() => {
        setTemplates([]);
        setError("暂时无法加载模板，请稍后重试。");
      });
  }, []);

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    setStrategyOverride(selectedTemplate.defaultStrategy);
  }, [selectedTemplate?.id]);

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
          pollError instanceof Error ? pollError.message : "刷新任务状态失败。";
        setError(message);
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [job?.id, job?.status]);

  useEffect(() => {
    if (!job) {
      return;
    }

    const nextRecentJob: RecentJob = {
      id: job.id,
      templateName: selectedTemplate ? getTemplateDisplay(selectedTemplate).name : "视频模板",
      status: job.status,
      scriptPreview: composedScript,
      resultUrl: job.finalVideo?.url ?? job.resultUrl ?? null,
      updatedAt: new Date().toISOString()
    };

    setRecentJobs((current) => {
      const merged = [nextRecentJob, ...current.filter((item) => item.id !== job.id)].slice(0, 6);
      persistRecentJobs(merged);
      return merged;
    });
  }, [composedScript, job, selectedTemplate?.name]);

  async function handleReferenceImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;

    if (!fileList?.length) {
      return;
    }

    const selectedFiles = Array.from(fileList).slice(0, 3 - uploadedImages.length);

    if (!selectedFiles.length) {
      setError("最多只能上传 3 张参考图。");
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
          : "一张或多张参考图上传失败。";
      setError(message);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function removeUploadedImage(id: string) {
    setUploadedImages((current) => current.filter((image) => image.id !== id));
  }

  function applyPreset(preset: BriefPreset) {
    setSubject(preset.subject);
    setScene(preset.scene);
    setTone(preset.tone);
    setAudience(preset.audience);
    setHook(preset.hook);
    setDetails(preset.details);
  }

  async function handleSubmit() {
    const templateVersionId = selectedTemplate?.versions?.[0]?.id;

    if (!selectedTemplate) {
      setError("请先选择一个视频模板。");
      return;
    }

    if (!templateVersionId) {
      setError("当前模板还没有可用版本。");
      return;
    }

    if (!subject.trim() || !scene.trim() || !hook.trim()) {
      setError("请补全主体、场景和核心画面顺序。");
      return;
    }

    try {
      setError("");
      setIsSubmitting(true);
      const result = await createGenerationJob({
        clientId: "browser-mvp-client",
        templateVersionId,
        strategy: effectiveStrategy,
        script: composedScript,
        referenceImageIds: uploadedImages.map((image) => image.id)
      });
      setJob(result);
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "创建生成任务失败。";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusStepIndex = statusSteps.findIndex((step) => step.key === job?.status);
  const currentResultUrl = job?.finalVideo?.url ?? job?.resultUrl ?? null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_26%),linear-gradient(180deg,_#17120f_0%,_#09090b_42%,_#050505_100%)] text-stone-100">
      <section className="mx-auto flex max-w-7xl flex-col gap-10 px-5 py-6 md:px-8 md:py-8">
        <header className="flex flex-col gap-8 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-5">
            <p className="text-xs uppercase tracking-[0.45em] text-amber-200/80">XVIDEO 视频工作台</p>
            <div className="space-y-3">
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-stone-50 md:text-6xl">
                给我们一个大概想法和几张参考图，我们帮你生成可用的 AI 视频。
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-300 md:text-lg">
                这个流程是为普通创作者设计的。你不需要懂提示词工程、镜头语言，也不需要自己调模型参数。
              </p>
            </div>
          </div>

          <div className="grid gap-3 self-start rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">模板数量</p>
              <p className="mt-2 text-2xl font-semibold text-stone-100">{templates.length || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">参考图片</p>
              <p className="mt-2 text-2xl font-semibold text-stone-100">{uploadedImages.length}/3</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">当前模型</p>
              <p className="mt-2 text-sm font-medium text-stone-100">Seedance 1.5 Pro</p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-stone-500">步骤 1</p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-50">选择视频模板</h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-stone-400">
                  模板会帮你隐藏复杂的提示词和参数配置。选一个最接近目标成片用途的模板，剩下的交给系统处理。
                </p>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {templates.map((template) => {
                  const isSelected = selectedTemplateId === template.id;
                  const display = getTemplateDisplay(template);

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`group flex h-full flex-col justify-between rounded-[1.75rem] border p-5 text-left transition ${
                        isSelected
                          ? "border-amber-300/70 bg-amber-300/10 shadow-[0_0_0_1px_rgba(252,211,77,0.25)]"
                          : "border-white/10 bg-black/20 hover:border-white/25 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                          {template.defaultStrategy}
                        </p>
                        <h3 className="mt-3 text-xl font-medium text-stone-50">{display.name}</h3>
                        <p className="mt-3 text-sm leading-6 text-stone-400">{display.description}</p>
                      </div>
                      <p className="mt-5 text-sm text-amber-100/80">
                        {isSelected ? "当前已选中" : "使用这个模板"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-stone-500">步骤 2</p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-50">填写简单创意描述</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {briefPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-stone-300 transition hover:border-amber-300/60 hover:text-amber-100"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-stone-300">主体</span>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="视频里主要出现谁，或者什么产品、物体？"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-300/60"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-stone-300">场景</span>
                  <input
                    value={scene}
                    onChange={(event) => setScene(event.target.value)}
                    placeholder="故事发生在哪里，整体应该是什么感觉？"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-300/60"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-stone-300">风格</span>
                  <input
                    value={tone}
                    onChange={(event) => setTone(event.target.value)}
                    placeholder="比如高级、情绪化、活泼、电影感……"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-300/60"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-stone-300">受众</span>
                  <input
                    value={audience}
                    onChange={(event) => setAudience(event.target.value)}
                    placeholder="这条视频主要想打动哪类人？"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-300/60"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-stone-300">核心画面顺序</span>
                  <textarea
                    value={hook}
                    onChange={(event) => setHook(event.target.value)}
                    placeholder="按大概顺序描述你想看到的几个关键画面。"
                    className="min-h-28 w-full rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-3 text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-300/60"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-stone-300">补充要求</span>
                  <textarea
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    placeholder="可以补充结尾氛围、产品重点、人物情绪等信息。"
                    className="min-h-24 w-full rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-3 text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-300/60"
                  />
                </label>
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-amber-300/20 bg-amber-300/8 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-amber-100/70">
                      预览
                    </p>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-200">
                      {composedScript}
                    </p>
                  </div>
                  <div className="min-w-44 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-stone-500">生成方式</p>
                    <select
                      value={effectiveStrategy}
                      onChange={(event) =>
                        setStrategyOverride(event.target.value as GenerationStrategy)
                      }
                      className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-stone-100 outline-none"
                    >
                      <option value="single">快速短片</option>
                      <option value="extend">连续续写</option>
                      <option value="storyboard">分镜式生成</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-stone-500">步骤 3</p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-50">上传参考图片</h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-stone-400">
                  可以上传产品图、人物参考图、关键风格图，或者场景氛围图。三张高质量图片，通常比很多普通图片更有效。
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-amber-300/40 bg-amber-300/10 px-5 py-3 text-sm font-medium text-amber-100 transition hover:border-amber-200 hover:bg-amber-300/15">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleReferenceImageChange}
                    className="hidden"
                    disabled={isUploading || uploadedImages.length >= 3}
                  />
                  {isUploading ? "上传中..." : "上传参考图片"}
                </label>
                <p className="text-sm text-stone-500">
                  {uploadedImages.length < 3
                    ? `还可以再上传 ${3 - uploadedImages.length} 张图片`
                    : "参考图已上传满"}
                </p>
              </div>

              {uploadedImages.length ? (
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {uploadedImages.map((image) => (
                    <article
                      key={image.id}
                      className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/25"
                    >
                      <img src={image.url} alt={image.filename} className="h-40 w-full object-cover" />
                      <div className="space-y-3 p-4">
                        <p className="truncate text-sm font-medium text-stone-200">{image.filename}</p>
                        <button
                          type="button"
                          onClick={() => removeUploadedImage(image.id)}
                          className="text-sm text-rose-300 transition hover:text-rose-200"
                        >
                          删除
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-[1.75rem] border border-dashed border-white/10 px-6 py-10 text-center text-sm leading-7 text-stone-500">
                  如果你更想保证主体一致性，至少上传一张清晰主图；如果你还想控制风格和氛围，建议上传两到三张。
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-6">
              <p className="text-xs uppercase tracking-[0.32em] text-stone-500">步骤 4</p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-50">开始生成</h2>
              <p className="mt-3 text-sm leading-6 text-stone-400">
                点击一次即可把你的创意描述、模板版本和参考素材提交到后端生成流程中。
              </p>

              <div className="mt-6 grid gap-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || isUploading}
                  className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-300"
                >
                  {isSubmitting ? "正在提交任务..." : "一键生成视频"}
                </button>
                {error ? <p className="text-sm leading-6 text-rose-300">{error}</p> : null}
              </div>

              <div className="mt-8 space-y-3">
                {statusSteps.map((step, index) => {
                  const isComplete = statusStepIndex >= index;
                  const isCurrent = job?.status === step.key;

                  return (
                    <div key={step.key} className="flex items-center gap-3">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          isComplete ? "bg-amber-300" : "bg-white/15"
                        } ${isCurrent ? "shadow-[0_0_0_6px_rgba(252,211,77,0.12)]" : ""}`}
                      />
                      <p className={isComplete ? "text-stone-200" : "text-stone-500"}>{step.label}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-stone-500">实时状态</p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-50">
                    {job ? getStatusLabel(job.status) : "等待中"}
                  </h2>
                </div>
                <p className={`text-sm font-medium ${getStatusTone(job?.status ?? "draft")}`}>
                  {job ? getStatusLabel(job.status) : "当前没有活动任务"}
                </p>
              </div>

              {job ? (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-stone-500">任务 ID</p>
                      <p className="mt-3 break-all text-sm text-stone-200">{job.id}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
                        平台任务号
                      </p>
                      <p className="mt-3 break-all text-sm text-stone-200">
                        {job.providerTaskId ?? "等待分配中"}
                      </p>
                    </div>
                  </div>

                  {job.primaryScene?.providerError ? (
                    <div className="rounded-[1.5rem] border border-rose-300/20 bg-rose-300/10 p-4 text-sm leading-6 text-rose-200">
                      {job.primaryScene.providerError}
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-stone-400">
                      {job.status === "queued" && "任务已提交成功，正在等待平台开始处理。"}
                      {job.status === "running" && "平台正在生成视频，这个页面会自动刷新状态。"}
                      {job.status === "succeeded" &&
                        "视频已经生成完成。如果结果已经回存到 COS，下方链接会直接指向你自己的存储地址。"}
                      {job.status === "failed" &&
                        "这次生成没有成功完成，你可以调整创意描述或更换模板后再试一次。"}
                    </div>
                  )}

                  {currentResultUrl ? (
                    <div className="rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/10 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/75">生成结果</p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <a
                          href={currentResultUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-medium text-stone-950"
                        >
                          打开视频
                        </a>
                        <a
                          href={currentResultUrl}
                          download
                          className="rounded-full border border-emerald-200/40 px-4 py-2 text-sm text-emerald-100"
                        >
                          下载视频
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-7 text-stone-500">
                  你提交任务后，这里会持续跟踪平台状态、片段进度以及最终的视频链接。
                </p>
              )}
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-stone-500">最近任务</p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-50">继续上次的创作</h2>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {recentJobs.length ? (
                  recentJobs.map((recentJob) => (
                    <button
                      key={recentJob.id}
                      type="button"
                      onClick={async () => {
                        try {
                          setError("");
                          const nextJob = await fetchGenerationJob(recentJob.id);
                          setJob(nextJob);
                        } catch (jobError) {
                          const message =
                            jobError instanceof Error
                              ? jobError.message
                              : "加载所选任务失败。";
                          setError(message);
                        }
                      }}
                      className="flex w-full flex-col gap-2 rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-left transition hover:border-white/20 hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-stone-100">{recentJob.templateName}</p>
                        <span className={`text-xs ${getStatusTone(recentJob.status)}`}>
                          {getStatusLabel(recentJob.status)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm leading-6 text-stone-400">
                        {recentJob.scriptPreview}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-stone-500">
                    在 MVP 阶段，即使没有账号系统，你最近的任务也会保存在当前设备里，方便你再次打开查看。
                  </p>
                )}
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}
