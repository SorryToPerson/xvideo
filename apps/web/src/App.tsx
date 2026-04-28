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
    description: "适合普通用户快速制作产品展示、种草推荐和轻叙事类短视频。"
  },
  "Product Seeding": {
    name: "产品种草短片",
    description: "适合普通用户快速制作产品展示、种草推荐和轻叙事类短视频。"
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
  { key: "upload", label: "补充参考图" },
  { key: "queued", label: "任务排队" },
  { key: "running", label: "模型生成" },
  { key: "succeeded", label: "成片可用" }
] as const;

const quickHints = [
  "主体写具体，比如“玻璃瓶护肤精华”会比“化妆品”稳定得多。",
  "场景和情绪尽量同时给出，比如“清晨阳光下的安静梳妆台”。",
  "参考图宁少勿杂，三张风格统一的图片通常更容易出片。"
];

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

function getStatusTone(status: string) {
  switch (status) {
    case "succeeded":
      return "text-emerald-300";
    case "failed":
      return "text-rose-300";
    case "running":
      return "text-amber-200";
    case "queued":
      return "text-sky-200";
    default:
      return "text-stone-300";
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "succeeded":
      return "border-emerald-300/30 bg-emerald-300/12 text-emerald-100";
    case "failed":
      return "border-rose-300/30 bg-rose-300/10 text-rose-100";
    case "running":
      return "border-amber-300/30 bg-amber-300/12 text-amber-100";
    case "queued":
      return "border-sky-300/30 bg-sky-300/10 text-sky-100";
    default:
      return "border-white/10 bg-white/5 text-stone-300";
  }
}

function getStrategyLabel(strategy: GenerationStrategy) {
  switch (strategy) {
    case "single":
      return "快速短片";
    case "extend":
      return "连续续写";
    case "storyboard":
      return "分镜生成";
    default:
      return strategy;
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
    .filter((line) => !line.endsWith("："))
    .join("。");
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

  return mapped ?? { name: template.name, description: template.description };
}

function formatTimeLabel(isoString: string) {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime())
    ? "刚刚更新"
    : `${date.getMonth() + 1} 月 ${date.getDate()} 日 ${date
        .getHours()
        .toString()
        .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
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

  const selectedTemplateDisplay = selectedTemplate ? getTemplateDisplay(selectedTemplate) : null;
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

  const readyChecks = [
    { label: "已选择模板", done: Boolean(selectedTemplate) },
    { label: "已填写主体", done: Boolean(subject.trim()) },
    { label: "已填写场景", done: Boolean(scene.trim()) },
    { label: "已填写核心画面", done: Boolean(hook.trim()) },
    { label: "已上传参考图", done: uploadedImages.length > 0 }
  ];

  const readyCount = readyChecks.filter((item) => item.done).length;
  const canSubmit =
    Boolean(selectedTemplate?.versions?.[0]?.id) &&
    Boolean(subject.trim()) &&
    Boolean(scene.trim()) &&
    Boolean(hook.trim()) &&
    !isSubmitting &&
    !isUploading;

  const statusStepIndex = statusSteps.findIndex((step) => step.key === job?.status);
  const currentResultUrl = job?.finalVideo?.url ?? job?.resultUrl ?? null;

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
      templateName: selectedTemplateDisplay?.name ?? "视频模板",
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
  }, [composedScript, job, selectedTemplateDisplay?.name]);

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
        uploadError instanceof Error ? uploadError.message : "一张或多张参考图上传失败。";
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_22%),radial-gradient(circle_at_85%_15%,_rgba(251,191,36,0.08),_transparent_18%),linear-gradient(180deg,_#18120d_0%,_#0d0b0a_48%,_#050505_100%)] text-stone-100">
      <section className="mx-auto flex max-w-[1500px] flex-col gap-8 px-4 py-5 md:px-8 md:py-7">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur md:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs tracking-[0.28em] text-amber-100/85">
                  XVIDEO 视频工作台
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-stone-400">
                  单击生成 · 模板驱动 · Seedance 1.5 Pro
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-stone-50 md:text-6xl">
                  普通用户也能像搭创意板一样，快速生成一条可用的视频。
                </h1>
                <p className="max-w-2xl text-base leading-7 text-stone-300 md:text-lg">
                  你只需要提供一个大概剧本和几张参考图，系统会根据模板自动补全提示词、组织生成流程，并持续返回任务状态。
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">当前模板</p>
                  <p className="mt-3 text-lg font-medium text-stone-100">
                    {selectedTemplateDisplay?.name ?? "等待选择"}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">参考图片</p>
                  <p className="mt-3 text-lg font-medium text-stone-100">{uploadedImages.length}/3</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">准备度</p>
                  <p className="mt-3 text-lg font-medium text-stone-100">
                    {readyCount}/{readyChecks.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_0.78fr]">
              <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">生成预览</p>
                <div className="mt-4 aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_30%),linear-gradient(180deg,_rgba(28,25,23,0.95),_rgba(10,10,10,0.98))] p-5">
                  {currentResultUrl ? (
                    <video
                      src={currentResultUrl}
                      controls
                      className="h-full w-full rounded-[1.25rem] object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col justify-between rounded-[1.25rem] border border-white/10 bg-black/20 p-5">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-400">
                          {selectedTemplateDisplay?.name ?? "创作预览"}
                        </span>
                        <span className="text-xs text-stone-500">{getStrategyLabel(effectiveStrategy)}</span>
                      </div>
                      <div className="space-y-3">
                        <p className="text-2xl font-medium leading-snug text-stone-50">
                          {subject || "从一个具体主体开始"}
                        </p>
                        <p className="text-sm leading-7 text-stone-400">
                          {scene || "补充场景和氛围后，这里会更接近最终生成方向。"}
                        </p>
                      </div>
                      <div className="grid gap-2 text-sm text-stone-500">
                        <div className="flex items-center justify-between border-t border-white/10 pt-3">
                          <span>风格</span>
                          <span className="max-w-[60%] text-right text-stone-300">{tone || "待填写"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>受众</span>
                          <span className="max-w-[60%] text-right text-stone-300">{audience || "待填写"}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">出片提示</p>
                  <h2 className="mt-3 text-2xl font-medium text-stone-50">让模型更稳一点</h2>
                </div>
                <div className="space-y-3">
                  {quickHints.map((hint) => (
                    <div
                      key={hint}
                      className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-stone-300"
                    >
                      {hint}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_380px]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-500">步骤 1</p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-50">选一个合适的模板</h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-stone-400">
                  模板负责隐藏复杂参数和提示词逻辑。对普通用户来说，先选“用途最接近”的模板，比直接调参数更有效。
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
                      className={`group relative overflow-hidden rounded-[1.75rem] border p-5 text-left transition ${
                        isSelected
                          ? "border-amber-300/60 bg-[linear-gradient(180deg,rgba(251,191,36,0.14),rgba(251,191,36,0.04))]"
                          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                      <div className="relative flex h-full flex-col justify-between gap-6">
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-400">
                              {getStrategyLabel(template.defaultStrategy)}
                            </span>
                            {isSelected ? (
                              <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-medium text-stone-950">
                                当前使用
                              </span>
                            ) : null}
                          </div>
                          <h3 className="mt-4 text-xl font-medium text-stone-50">{display.name}</h3>
                          <p className="mt-3 text-sm leading-7 text-stone-400">{display.description}</p>
                        </div>

                        <p className="text-sm text-stone-500">
                          {isSelected ? "这个模板会用于当前任务" : "点击切换到这个模板"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-500">步骤 2</p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-50">搭一个清晰的创意板</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {briefPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-stone-300 transition hover:border-amber-300/60 hover:bg-amber-300/10 hover:text-amber-100"
                    >
                      套用 {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <span className="text-sm font-medium text-stone-200">主体</span>
                  <p className="mt-1 text-xs leading-6 text-stone-500">视频里最重要的人、产品或物件</p>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="例如：一瓶玻璃瓶护肤精华"
                    className="mt-4 w-full border-none bg-transparent p-0 text-base text-stone-100 outline-none placeholder:text-stone-600"
                  />
                </label>

                <label className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <span className="text-sm font-medium text-stone-200">场景</span>
                  <p className="mt-1 text-xs leading-6 text-stone-500">发生地点、光线、空间质感</p>
                  <input
                    value={scene}
                    onChange={(event) => setScene(event.target.value)}
                    placeholder="例如：晨光照进极简梳妆台"
                    className="mt-4 w-full border-none bg-transparent p-0 text-base text-stone-100 outline-none placeholder:text-stone-600"
                  />
                </label>

                <label className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <span className="text-sm font-medium text-stone-200">风格</span>
                  <p className="mt-1 text-xs leading-6 text-stone-500">情绪、镜头感觉、整体审美</p>
                  <input
                    value={tone}
                    onChange={(event) => setTone(event.target.value)}
                    placeholder="例如：高级、安静、电影感"
                    className="mt-4 w-full border-none bg-transparent p-0 text-base text-stone-100 outline-none placeholder:text-stone-600"
                  />
                </label>

                <label className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <span className="text-sm font-medium text-stone-200">受众</span>
                  <p className="mt-1 text-xs leading-6 text-stone-500">这条视频主要打动谁</p>
                  <input
                    value={audience}
                    onChange={(event) => setAudience(event.target.value)}
                    placeholder="例如：关注生活方式的年轻女性"
                    className="mt-4 w-full border-none bg-transparent p-0 text-base text-stone-100 outline-none placeholder:text-stone-600"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4">
                <label className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <span className="text-sm font-medium text-stone-200">核心画面顺序</span>
                  <p className="mt-1 text-xs leading-6 text-stone-500">按顺序写下最想看到的 2 到 4 个关键画面</p>
                  <textarea
                    value={hook}
                    onChange={(event) => setHook(event.target.value)}
                    placeholder="例如：先展示产品英雄镜头，再切质地特写，最后展示自然使用场景。"
                    className="mt-4 min-h-28 w-full resize-none border-none bg-transparent p-0 text-base text-stone-100 outline-none placeholder:text-stone-600"
                  />
                </label>

                <label className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <span className="text-sm font-medium text-stone-200">补充要求</span>
                  <p className="mt-1 text-xs leading-6 text-stone-500">比如结尾情绪、品牌落点、人物状态等</p>
                  <textarea
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    placeholder="例如：结尾停在安静、干净、有高级感的产品镜头。"
                    className="mt-4 min-h-24 w-full resize-none border-none bg-transparent p-0 text-base text-stone-100 outline-none placeholder:text-stone-600"
                  />
                </label>
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-amber-300/20 bg-amber-300/8 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs uppercase tracking-[0.25em] text-amber-100/75">系统预览</p>
                    <p className="mt-3 text-sm leading-7 text-stone-200">{composedScript}</p>
                  </div>
                  <div className="min-w-52 rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-stone-500">生成方式</p>
                    <select
                      value={effectiveStrategy}
                      onChange={(event) =>
                        setStrategyOverride(event.target.value as GenerationStrategy)
                      }
                      className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-stone-100 outline-none"
                    >
                      <option value="single">快速短片</option>
                      <option value="extend">连续续写</option>
                      <option value="storyboard">分镜生成</option>
                    </select>
                    <p className="mt-3 text-xs leading-6 text-stone-500">
                      {effectiveStrategy === "extend"
                        ? "更适合单场景连续叙事，强调镜头延续。"
                        : effectiveStrategy === "storyboard"
                          ? "更适合多个镜头段落组成的结构化视频。"
                          : "更适合快速验证一个短视频创意。"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-500">步骤 3</p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-50">上传参考图片</h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-stone-400">
                  你可以上传产品图、人物图、风格参考图或场景氛围图。三张一致性高的图片，通常比很多杂乱图片更有帮助。
                </p>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-black/20 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-amber-300/40 bg-amber-300/10 px-5 py-3 text-sm font-medium text-amber-100 transition hover:border-amber-200 hover:bg-amber-300/15">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleReferenceImageChange}
                        className="hidden"
                        disabled={isUploading || uploadedImages.length >= 3}
                      />
                      {isUploading ? "上传中..." : "选择参考图片"}
                    </label>
                    <span className="text-sm text-stone-500">
                      {uploadedImages.length < 3
                        ? `还可以再上传 ${3 - uploadedImages.length} 张`
                        : "参考图已上传满"}
                    </span>
                  </div>

                  {uploadedImages.length ? (
                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      {uploadedImages.map((image) => (
                        <article
                          key={image.id}
                          className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/25"
                        >
                          <img src={image.url} alt={image.filename} className="h-40 w-full object-cover" />
                          <div className="flex items-center justify-between gap-3 p-4">
                            <p className="truncate text-sm font-medium text-stone-200">
                              {image.filename}
                            </p>
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
                    <div className="mt-5 flex min-h-52 items-center justify-center rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.12),_transparent_35%),rgba(255,255,255,0.02)] p-6 text-center text-sm leading-7 text-stone-500">
                      还没有上传图片。建议先放一张主体图，再补两张风格或场景图，让模型更容易对齐你的预期。
                    </div>
                  )}
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">选图建议</p>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-stone-300">
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                      主体清晰可辨，不要被过多文字或杂乱背景干扰。
                    </div>
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                      如果是产品类视频，最好包含一张近景图和一张生活方式图。
                    </div>
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                      如果要做统一情绪感，尽量保持色调接近，不要混搭完全不同的画风。
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)] backdrop-blur md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-500">步骤 4</p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-50">一键生成</h2>
                </div>
                <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-400">
                  {readyCount}/{readyChecks.length} 已完成
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {readyChecks.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <span className="text-sm text-stone-300">{item.label}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        item.done
                          ? "bg-emerald-300/15 text-emerald-100"
                          : "bg-white/5 text-stone-500"
                      }`}
                    >
                      {item.done ? "已完成" : "待补充"}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="mt-6 w-full rounded-full bg-amber-300 px-5 py-4 text-sm font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-300"
              >
                {isSubmitting ? "正在提交任务..." : "立即生成视频"}
              </button>

              {error ? <p className="mt-4 text-sm leading-6 text-rose-300">{error}</p> : null}
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-500">实时状态</p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-50">
                    {job ? getStatusLabel(job.status) : "等待中"}
                  </h2>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${getStatusBadge(
                    job?.status ?? "draft"
                  )}`}
                >
                  {job ? getStatusLabel(job.status) : "未开始"}
                </span>
              </div>

              {job ? (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-3">
                    {statusSteps.map((step, index) => {
                      const isComplete = statusStepIndex >= index;
                      const isCurrent = job.status === step.key;

                      return (
                        <div key={step.key} className="flex items-center gap-3">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              isComplete ? "bg-amber-300" : "bg-white/15"
                            } ${isCurrent ? "shadow-[0_0_0_6px_rgba(252,211,77,0.12)]" : ""}`}
                          />
                          <p className={isComplete ? "text-stone-200" : "text-stone-500"}>
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">任务信息</p>
                    <div className="mt-3 space-y-2 text-sm text-stone-300">
                      <div>
                        <span className="text-stone-500">任务 ID：</span>
                        <span className="break-all">{job.id}</span>
                      </div>
                      <div>
                        <span className="text-stone-500">平台任务号：</span>
                        <span className="break-all">{job.providerTaskId ?? "等待分配中"}</span>
                      </div>
                    </div>
                  </div>

                  {job.primaryScene?.providerError ? (
                    <div className="rounded-[1.5rem] border border-rose-300/20 bg-rose-300/10 p-4 text-sm leading-6 text-rose-200">
                      {job.primaryScene.providerError}
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-stone-400">
                      {job.status === "queued" && "任务已提交成功，正在等待平台开始处理。"}
                      {job.status === "running" && "平台正在生成视频，这个页面会自动轮询并更新最新状态。"}
                      {job.status === "succeeded" &&
                        "视频已经生成完成。如果结果已回存到 COS，下方按钮将直接打开你的存储链接。"}
                      {job.status === "failed" &&
                        "这次生成没有成功完成，建议先微调主体、场景或参考图后再次尝试。"}
                    </div>
                  )}

                  {currentResultUrl ? (
                    <div className="rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/10 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/75">生成结果</p>
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
                  提交任务后，这里会持续跟踪平台状态、片段进度和最终成片链接。
                </p>
              )}
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-500">最近任务</p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-50">继续上次创作</h2>
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
                            jobError instanceof Error ? jobError.message : "加载所选任务失败。";
                          setError(message);
                        }
                      }}
                      className="flex w-full flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-left transition hover:border-white/20 hover:bg-white/[0.04]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-stone-100">{recentJob.templateName}</p>
                          <p className="mt-1 text-xs text-stone-500">{formatTimeLabel(recentJob.updatedAt)}</p>
                        </div>
                        <span className={`text-xs ${getStatusTone(recentJob.status)}`}>
                          {getStatusLabel(recentJob.status)}
                        </span>
                      </div>
                      <p className="line-clamp-3 text-sm leading-6 text-stone-400">
                        {recentJob.scriptPreview}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-stone-500">
                    在 MVP 阶段，即使没有账号系统，最近任务也会保存在当前设备里，方便你继续查看。
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
