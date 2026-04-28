import { useEffect, useMemo, useState } from "react";
import { fetchTemplates } from "./lib/api";

type Template = {
  id: string;
  slug?: string;
  name: string;
  description: string;
  defaultStrategy: "single" | "extend" | "storyboard" | string;
  versions?: Array<{ id: string }>;
};

const strategyMeta: Record<
  string,
  { label: string; description: string; chipClass: string }
> = {
  single: {
    label: "快速短片",
    description: "适合快速验证单条创意和短视频模板。",
    chipClass: "border-amber-300/30 bg-amber-300/12 text-amber-100"
  },
  extend: {
    label: "连续续写",
    description: "适合单场景连续叙事和镜头延长类任务。",
    chipClass: "border-sky-300/30 bg-sky-300/10 text-sky-100"
  },
  storyboard: {
    label: "分镜生成",
    description: "适合结构化叙事、多段场景和长视频预案。",
    chipClass: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
  }
};

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

const adminGuides = [
  "先把高频模板做稳，再扩充低频场景，避免第一期模板过多且质量不均。",
  "每次调 prompt、风格约束或默认策略时，都要记成一个模板版本，方便回滚和比对。",
  "普通用户看到的是简单表单，复杂参数应该沉到这里，而不是暴露到前台。"
];

const systemCards = [
  {
    title: "模板版本管理",
    desc: "跟踪每次提示词骨架、策略和默认参数调整，保持生成结果可回溯。"
  },
  {
    title: "任务监控",
    desc: "查看模型任务状态、失败原因和平台返回信息，帮助快速排查问题。"
  },
  {
    title: "策略沉淀",
    desc: "围绕 single / extend / storyboard 三类能力持续优化出片稳定性。"
  }
];

function getStrategyMeta(strategy: string) {
  return (
    strategyMeta[strategy] ?? {
      label: strategy,
      description: "自定义策略类型。",
      chipClass: "border-white/10 bg-white/5 text-stone-200"
    }
  );
}

function getTemplateDisplay(template: Template) {
  const mapped =
    templateTextMap[template.slug ?? ""] ??
    templateTextMap[template.id] ??
    templateTextMap[template.name];

  return mapped ?? { name: template.name, description: template.description };
}

export function App() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTemplates()
      .then((data: Template[]) => {
        setTemplates(data);
        if (data[0]) {
          setSelectedTemplateId(data[0].id);
        }
      })
      .catch((loadError) => {
        setTemplates([]);
        setError(loadError instanceof Error ? loadError.message : "加载模板失败");
      });
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null,
    [selectedTemplateId, templates]
  );

  const selectedDisplay = selectedTemplate ? getTemplateDisplay(selectedTemplate) : null;
  const selectedStrategy = selectedTemplate ? getStrategyMeta(selectedTemplate.defaultStrategy) : null;
  const templateCount = templates.length;
  const extendReadyCount = templates.filter((template) => template.defaultStrategy === "extend").length;
  const storyboardReadyCount = templates.filter((template) => template.defaultStrategy === "storyboard").length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_transparent_20%),radial-gradient(circle_at_88%_12%,_rgba(251,191,36,0.07),_transparent_14%),linear-gradient(180deg,_#18120d_0%,_#0c0b0a_48%,_#050505_100%)] text-stone-100">
      <section className="mx-auto flex max-w-[1500px] flex-col gap-8 px-4 py-5 md:px-8 md:py-7">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur md:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs tracking-[0.28em] text-amber-100/85">
                  XVIDEO 后台工作台
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-stone-400">
                  单租户运营后台 · 模板驱动 · 管理复杂度
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-stone-50 md:text-6xl">
                  把复杂的生成策略藏在后台，把简单的一键体验留给前台用户。
                </h1>
                <p className="max-w-2xl text-base leading-7 text-stone-300 md:text-lg">
                  这里负责管理模板、策略和运营规则。普通用户看到的是简单表单，而后台需要持续沉淀出片稳定性和最佳实践。
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">模板数量</p>
                  <p className="mt-3 text-2xl font-semibold text-stone-100">{templateCount}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">续写型模板</p>
                  <p className="mt-3 text-2xl font-semibold text-stone-100">{extendReadyCount}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">分镜型模板</p>
                  <p className="mt-3 text-2xl font-semibold text-stone-100">{storyboardReadyCount}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">当前选中模板</p>
                {selectedTemplate && selectedDisplay && selectedStrategy ? (
                  <div className="mt-4 flex h-full flex-col justify-between gap-6">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className={`rounded-full border px-3 py-1 text-xs ${selectedStrategy.chipClass}`}>
                          {selectedStrategy.label}
                        </span>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-400">
                          模板版本 {selectedTemplate.versions?.length ?? 0}
                        </span>
                      </div>
                      <h2 className="mt-4 text-3xl font-medium text-stone-50">{selectedDisplay.name}</h2>
                      <p className="mt-3 text-sm leading-7 text-stone-400">{selectedDisplay.description}</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-stone-300">
                      {selectedStrategy.description}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1.5rem] border border-dashed border-white/10 p-6 text-sm leading-7 text-stone-500">
                    暂时还没有加载到模板数据。
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">运营提醒</p>
                {adminGuides.map((guide) => (
                  <div
                    key={guide}
                    className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-stone-300"
                  >
                    {guide}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-500">模板库</p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-50">所有已接入模板</h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-stone-400">
                  这里用于挑选需要维护的模板。建议优先迭代高频模板，把一键出片体验做稳，再扩展更复杂的场景。
                </p>
              </div>

              {error ? (
                <div className="mt-5 rounded-[1.5rem] border border-rose-300/20 bg-rose-300/10 p-4 text-sm leading-6 text-rose-200">
                  {error}
                </div>
              ) : null}

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {templates.map((template) => {
                  const isSelected = template.id === selectedTemplate?.id;
                  const display = getTemplateDisplay(template);
                  const strategy = getStrategyMeta(template.defaultStrategy);

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
                      <div className="relative flex h-full flex-col gap-5">
                        <div className="flex items-center justify-between gap-3">
                          <span className={`rounded-full border px-3 py-1 text-xs ${strategy.chipClass}`}>
                            {strategy.label}
                          </span>
                          {isSelected ? (
                            <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-medium text-stone-950">
                              正在查看
                            </span>
                          ) : null}
                        </div>

                        <div>
                          <h3 className="text-xl font-medium text-stone-50">{display.name}</h3>
                          <p className="mt-3 text-sm leading-7 text-stone-400">{display.description}</p>
                        </div>

                        <div className="grid gap-2 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-stone-400">
                          <div className="flex items-center justify-between">
                            <span>默认策略</span>
                            <span className="text-stone-200">{strategy.label}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>模板版本数</span>
                            <span className="text-stone-200">{template.versions?.length ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-500">模板详情</p>
                  <h2 className="mt-2 text-2xl font-semibold text-stone-50">围绕当前模板的运营视图</h2>
                </div>
              </div>

              {selectedTemplate && selectedDisplay && selectedStrategy ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-stone-500">模板定位</p>
                        <h3 className="mt-3 text-3xl font-medium text-stone-50">{selectedDisplay.name}</h3>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs ${selectedStrategy.chipClass}`}>
                        {selectedStrategy.label}
                      </span>
                    </div>

                    <p className="mt-5 text-sm leading-7 text-stone-300">{selectedDisplay.description}</p>

                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">面向用户</p>
                        <p className="mt-3 text-sm leading-7 text-stone-300">
                          普通用户只需要填写主题、场景、情绪和参考图，不直接接触专业 prompt。
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">后台责任</p>
                        <p className="mt-3 text-sm leading-7 text-stone-300">
                          通过模板版本、默认策略和运营规则，稳定输出一条更容易可用的视频。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-stone-500">运营检查清单</p>
                    <div className="mt-4 space-y-3">
                      {[
                        "模板名称和描述是否足够让普通用户一眼看懂用途",
                        "默认策略是否和视频结构匹配",
                        "是否已经记录清楚模板版本变更原因",
                        "参考图规则是否适合当前模板的主体一致性要求"
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-start gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-stone-300"
                        >
                          <span className="mt-2 h-2.5 w-2.5 rounded-full bg-amber-300" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[1.75rem] border border-dashed border-white/10 p-6 text-sm leading-7 text-stone-500">
                  选中一个模板后，这里会展示更完整的运营视图。
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)] backdrop-blur md:p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-stone-500">系统重点</p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-50">当前后台关注点</h2>
              </div>

              <div className="mt-5 space-y-3">
                {systemCards.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4"
                  >
                    <p className="text-sm font-medium text-stone-100">{card.title}</p>
                    <p className="mt-2 text-sm leading-7 text-stone-400">{card.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5 md:p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-stone-500">下一步建议</p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-50">适合继续补的能力</h2>
              </div>

              <div className="mt-5 space-y-3 text-sm leading-7 text-stone-300">
                <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                  模板编辑表单：直接在后台修改模板名称、说明和默认策略。
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                  版本管理视图：展示每次 prompt 骨架和策略调整记录。
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                  任务监控列表：查看真实生成任务的状态、失败原因和成功率。
                </div>
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}
