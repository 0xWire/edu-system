'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/contexts/LanguageContext';
import { AIService } from '@/services/ai';
import type {
  AIGenerationConfig,
  AILayerName,
  AILayerProviderTrace,
  AIPipelineRunRequest,
  AIPipelineRunResponse,
  AIProviderName,
  AIProviderStatus,
  AIValidationIssue
} from '@/types/ai';

const ALL_PROVIDERS: AIProviderName[] = ['openai', 'gemini', 'deepseek', 'openrouter', 'local'];
const ALL_LAYERS: AILayerName[] = ['plan', 'generate', 'validate', 'refine'];

type ResultTab = 'final' | 'validation' | 'plan' | 'draft' | 'trace' | 'raw';

type LayerOverrideState = Record<AILayerName, { enabled: boolean; order: AIProviderName[] }>;

type AIStudioService = {
  getProviders: () => Promise<AIProviderStatus[]>;
  runPipeline: (payload: AIPipelineRunRequest) => Promise<AIPipelineRunResponse>;
};

type AIStudioAutomation = {
  enabled?: boolean;
  delayMs?: number;
  material?: {
    title?: string;
    text?: string;
    sourceUrl?: string;
    language?: string;
    note?: string;
  };
  generation?: {
    variantsCount?: string;
    questionsPerVariant?: string;
    difficulty?: string;
    audience?: string;
    outputLanguage?: string;
    includeExplanations?: boolean;
    includePracticeTest?: boolean;
  };
};

interface DashboardAIStudioProps {
  service?: AIStudioService;
  automation?: AIStudioAutomation;
  hideBackButton?: boolean;
}

const createDefaultLayerOverrides = (): LayerOverrideState => ({
  plan: { enabled: false, order: [...ALL_PROVIDERS] },
  generate: { enabled: false, order: [...ALL_PROVIDERS] },
  validate: { enabled: false, order: [...ALL_PROVIDERS] },
  refine: { enabled: false, order: [...ALL_PROVIDERS] }
});

const toInt = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

const prettifyProvider = (provider: AIProviderName): string => {
  switch (provider) {
    case 'openai':
      return 'OpenAI';
    case 'gemini':
      return 'Gemini';
    case 'deepseek':
      return 'DeepSeek';
    case 'openrouter':
      return 'OpenRouter';
    case 'local':
      return 'Local AI';
    default:
      return provider;
  }
};

const prettifyLayer = (layer: AILayerName): string => {
  switch (layer) {
    case 'plan':
      return 'Plan';
    case 'generate':
      return 'Generate';
    case 'validate':
      return 'Validate';
    case 'refine':
      return 'Refine';
    default:
      return layer;
  }
};

const issueSeverityClass = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'border-red-400/50 bg-red-500/15 text-red-100';
    case 'high':
      return 'border-orange-400/50 bg-orange-500/15 text-orange-100';
    case 'medium':
      return 'border-yellow-300/50 bg-yellow-500/15 text-yellow-100';
    default:
      return 'border-slate-300/30 bg-slate-700/30 text-slate-100';
  }
};

export default function DashboardAIStudio({
  service,
  automation,
  hideBackButton = false
}: DashboardAIStudioProps = {}) {
  const aiService = service ?? AIService;
  const router = useRouter();
  const { t } = useI18n();
  const autoFilledRef = useRef(false);
  const autoRunRef = useRef(false);

  const [providers, setProviders] = useState<AIProviderStatus[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState<string | null>(null);

  const [result, setResult] = useState<AIPipelineRunResponse | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ResultTab>('final');
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  const [materialTitle, setMaterialTitle] = useState('');
  const [materialText, setMaterialText] = useState('');
  const [materialSourceURL, setMaterialSourceURL] = useState('');
  const [materialLanguage, setMaterialLanguage] = useState('');
  const [materialNote, setMaterialNote] = useState('');

  const [variantsCount, setVariantsCount] = useState('3');
  const [questionsPerVariant, setQuestionsPerVariant] = useState('20');
  const [difficulty, setDifficulty] = useState('mixed');
  const [audience, setAudience] = useState('students');
  const [outputLanguage, setOutputLanguage] = useState('ru');
  const [includeExplanations, setIncludeExplanations] = useState(true);
  const [includePracticeTest, setIncludePracticeTest] = useState(true);

  const [providerOrder, setProviderOrder] = useState<AIProviderName[]>([...ALL_PROVIDERS]);
  const [layerOverrides, setLayerOverrides] = useState<LayerOverrideState>(createDefaultLayerOverrides);

  const providerStatusMap = useMemo(() => {
    const map = new Map<AIProviderName, AIProviderStatus>();
    providers.forEach((provider) => {
      map.set(provider.name, provider);
    });
    return map;
  }, [providers]);

  const configuredProviders = useMemo(
    () => providers.filter((provider) => provider.configured).map((provider) => provider.name),
    [providers]
  );

  const hasConfiguredProvider = configuredProviders.length > 0;

  const loadProviders = useCallback(async () => {
    try {
      setProvidersLoading(true);
      const data = await aiService.getProviders();
      setProviders(data);
      setProvidersError(null);
    } catch (error) {
      console.error('Failed to fetch AI providers', error);
      setProviders([]);
      setProvidersError(t('aiStudio.errors.providersLoad'));
    } finally {
      setProvidersLoading(false);
    }
  }, [aiService, t]);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    if (!copyNotice) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setCopyNotice(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [copyNotice]);

  const moveInOrder = useCallback((order: AIProviderName[], index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= order.length) {
      return order;
    }
    const next = [...order];
    const current = next[index];
    next[index] = next[target];
    next[target] = current;
    return next;
  }, []);

  const toggleProviderInMainOrder = useCallback((provider: AIProviderName) => {
    setProviderOrder((prev) => {
      if (prev.includes(provider)) {
        return prev.filter((item) => item !== provider);
      }
      return [...prev, provider];
    });
  }, []);

  const setConfiguredOnlyMainOrder = useCallback(() => {
    if (!hasConfiguredProvider) {
      return;
    }
    setProviderOrder(configuredProviders);
  }, [configuredProviders, hasConfiguredProvider]);

  const toggleLayerOverride = useCallback((layer: AILayerName, enabled: boolean) => {
    setLayerOverrides((prev) => ({
      ...prev,
      [layer]: {
        ...prev[layer],
        enabled,
        order: prev[layer].order.length > 0 ? prev[layer].order : [...providerOrder]
      }
    }));
  }, [providerOrder]);

  const toggleProviderInLayerOrder = useCallback((layer: AILayerName, provider: AIProviderName) => {
    setLayerOverrides((prev) => {
      const current = prev[layer].order;
      const nextOrder = current.includes(provider)
        ? current.filter((item) => item !== provider)
        : [...current, provider];
      return {
        ...prev,
        [layer]: {
          ...prev[layer],
          order: nextOrder
        }
      };
    });
  }, []);

  const runPipeline = useCallback(async () => {
    const trimmedText = materialText.trim();
    const trimmedURL = materialSourceURL.trim();

    if (!trimmedText && !trimmedURL) {
      setRunError(t('aiStudio.errors.materialRequired'));
      return;
    }
    if (providerOrder.length === 0) {
      setRunError(t('aiStudio.errors.providerOrderRequired'));
      return;
    }

    const generationConfig: AIGenerationConfig = {
      variants_count: toInt(variantsCount, 3),
      questions_per_variant: toInt(questionsPerVariant, 20),
      difficulty: difficulty.trim(),
      audience: audience.trim(),
      output_language: outputLanguage.trim(),
      include_explanations: includeExplanations,
      include_practice_test: includePracticeTest
    };

    const layerOrder: Partial<Record<AILayerName, AIProviderName[]>> = {};
    ALL_LAYERS.forEach((layer) => {
      const config = layerOverrides[layer];
      if (config.enabled && config.order.length > 0) {
        layerOrder[layer] = config.order;
      }
    });

    const payload: AIPipelineRunRequest = {
      material: {
        title: materialTitle.trim() || undefined,
        text: trimmedText || undefined,
        source_url: trimmedURL || undefined,
        language: materialLanguage.trim() || undefined,
        additional_note: materialNote.trim() || undefined
      },
      generation_config: generationConfig,
      provider: {
        order: providerOrder,
        layer_order: layerOrder
      }
    };

    try {
      setRunLoading(true);
      setRunError(null);
      const response = await aiService.runPipeline(payload);
      setResult(response);
      setActiveTab('final');
    } catch (error) {
      console.error('Failed to run AI pipeline', error);
      if (error instanceof Error && 'response' in error) {
        const axiosErr = error as { response?: { data?: { message?: string } } };
        setRunError(axiosErr.response?.data?.message ?? t('aiStudio.errors.runFailed'));
      } else {
        setRunError(t('aiStudio.errors.runFailed'));
      }
    } finally {
      setRunLoading(false);
    }
  }, [
    audience,
    difficulty,
    includeExplanations,
    includePracticeTest,
    layerOverrides,
    materialLanguage,
    materialNote,
    materialSourceURL,
    materialText,
    materialTitle,
    outputLanguage,
    providerOrder,
    questionsPerVariant,
    aiService,
    t,
    variantsCount
  ]);

  useEffect(() => {
    if (!automation?.enabled || autoFilledRef.current) {
      return;
    }

    const autoMaterial = automation.material ?? {};
    const autoGeneration = automation.generation ?? {};

    if (autoMaterial.title !== undefined) setMaterialTitle(autoMaterial.title);
    if (autoMaterial.text !== undefined) setMaterialText(autoMaterial.text);
    if (autoMaterial.sourceUrl !== undefined) setMaterialSourceURL(autoMaterial.sourceUrl);
    if (autoMaterial.language !== undefined) setMaterialLanguage(autoMaterial.language);
    if (autoMaterial.note !== undefined) setMaterialNote(autoMaterial.note);

    if (autoGeneration.variantsCount !== undefined) setVariantsCount(autoGeneration.variantsCount);
    if (autoGeneration.questionsPerVariant !== undefined) setQuestionsPerVariant(autoGeneration.questionsPerVariant);
    if (autoGeneration.difficulty !== undefined) setDifficulty(autoGeneration.difficulty);
    if (autoGeneration.audience !== undefined) setAudience(autoGeneration.audience);
    if (autoGeneration.outputLanguage !== undefined) setOutputLanguage(autoGeneration.outputLanguage);
    if (autoGeneration.includeExplanations !== undefined) setIncludeExplanations(autoGeneration.includeExplanations);
    if (autoGeneration.includePracticeTest !== undefined) setIncludePracticeTest(autoGeneration.includePracticeTest);

    autoFilledRef.current = true;
  }, [automation]);

  useEffect(() => {
    if (!automation?.enabled || autoRunRef.current) {
      return;
    }
    if (providersLoading || runLoading) {
      return;
    }
    if (!autoFilledRef.current) {
      return;
    }
    if (!materialText.trim() && !materialSourceURL.trim()) {
      return;
    }

    const timer = window.setTimeout(() => {
      autoRunRef.current = true;
      void runPipeline();
    }, automation.delayMs ?? 900);

    return () => window.clearTimeout(timer);
  }, [automation, materialSourceURL, materialText, providersLoading, runLoading, runPipeline]);

  const copyToClipboard = useCallback(async (mode: 'final' | 'all') => {
    if (!result || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    const payload = mode === 'final' ? result.final : result;

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyNotice(mode === 'final' ? t('aiStudio.copy.final') : t('aiStudio.copy.full'));
    } catch (error) {
      console.error('Failed to copy AI output', error);
    }
  }, [result, t]);

  const downloadResult = useCallback(() => {
    if (!result || typeof window === 'undefined') {
      return;
    }
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ai-pipeline-${Date.now()}.json`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }, [result]);

  const tabs = useMemo(
    () => [
      { key: 'final' as const, label: t('aiStudio.tabs.final') },
      { key: 'validation' as const, label: t('aiStudio.tabs.validation') },
      { key: 'plan' as const, label: t('aiStudio.tabs.plan') },
      { key: 'draft' as const, label: t('aiStudio.tabs.draft') },
      { key: 'trace' as const, label: t('aiStudio.tabs.trace') },
      { key: 'raw' as const, label: t('aiStudio.tabs.raw') }
    ],
    [t]
  );

  const renderProviderPills = (order: AIProviderName[], onToggle: (provider: AIProviderName) => void) => {
    return (
      <div className="flex flex-wrap gap-2">
        {ALL_PROVIDERS.map((provider) => {
          const enabled = order.includes(provider);
          const status = providerStatusMap.get(provider);
          const isConfigured = status?.configured ?? false;

          return (
            <button
              key={provider}
              type="button"
              onClick={() => onToggle(provider)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                enabled
                  ? isConfigured
                    ? 'border-emerald-300/50 bg-emerald-500/20 text-emerald-100'
                    : 'border-yellow-300/50 bg-yellow-500/20 text-yellow-100'
                  : 'border-white/15 bg-white/5 text-slate-300 hover:border-indigo-300/40 hover:text-white'
              }`}
            >
              {prettifyProvider(provider)}
            </button>
          );
        })}
      </div>
    );
  };

  const renderOrderedList = (
    order: AIProviderName[],
    onMove: (index: number, direction: 'up' | 'down') => void,
    onRemove: (provider: AIProviderName) => void
  ) => {
    if (order.length === 0) {
      return <p className="text-sm text-slate-400">{t('aiStudio.providers.emptyOrder')}</p>;
    }

    return (
      <div className="space-y-2">
        {order.map((provider, index) => {
          const status = providerStatusMap.get(provider);
          return (
            <div
              key={`${provider}-${index}`}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-white">{prettifyProvider(provider)}</p>
                <p className={`text-xs ${status?.configured ? 'text-emerald-300' : 'text-yellow-300'}`}>
                  {status?.configured ? t('aiStudio.providers.configured') : t('aiStudio.providers.notConfigured')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onMove(index, 'up')}
                  disabled={index === 0}
                  className="rounded-lg border border-white/20 px-2 py-1 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onMove(index, 'down')}
                  disabled={index === order.length - 1}
                  className="rounded-lg border border-white/20 px-2 py-1 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(provider)}
                  className="rounded-lg border border-red-300/40 px-2 py-1 text-xs text-red-200 transition hover:bg-red-500/15"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderValidationIssues = (issues: AIValidationIssue[]) => {
    if (!issues.length) {
      return <p className="text-sm text-emerald-200">{t('aiStudio.validation.noIssues')}</p>;
    }

    return (
      <div className="space-y-3">
        {issues.map((issue, index) => (
          <article key={`${issue.location}-${index}`} className={`rounded-2xl border p-4 ${issueSeverityClass(issue.severity)}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.25em]">{issue.severity}</p>
              <p className="text-xs opacity-90">{issue.location || t('aiStudio.validation.unknownLocation')}</p>
            </div>
            <p className="mt-2 text-sm font-medium">{issue.problem}</p>
            {issue.recommendation && <p className="mt-1 text-sm opacity-95">{issue.recommendation}</p>}
          </article>
        ))}
      </div>
    );
  };

  const renderTrace = (trace: AILayerProviderTrace[]) => {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {trace.map((item) => (
          <article key={item.layer} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.25em] text-indigo-200">{prettifyLayer(item.layer)}</p>
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                  item.fallback_used
                    ? 'border border-yellow-300/40 bg-yellow-500/20 text-yellow-100'
                    : 'border border-emerald-300/40 bg-emerald-500/20 text-emerald-100'
                }`}
              >
                {item.fallback_used ? t('aiStudio.trace.fallbackUsed') : t('aiStudio.trace.primaryUsed')}
              </span>
            </div>

            <p className="mt-2 text-sm text-white">{prettifyProvider(item.provider)}</p>
            <p className="text-xs text-slate-300">{item.model || t('aiStudio.trace.unknownModel')}</p>
            <p className="mt-2 text-xs text-slate-200">
              {t('aiStudio.trace.attempts', { count: item.attempts })}
            </p>

            {item.errors && item.errors.length > 0 && (
              <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2">
                <summary className="cursor-pointer text-xs text-amber-200">{t('aiStudio.trace.errors')}</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-100">
                  {item.errors.map((err, index) => (
                    <li key={`${item.layer}-err-${index}`}>{err}</li>
                  ))}
                </ul>
              </details>
            )}
          </article>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">{t('aiStudio.tag')}</p>
            <h1 className="mt-1 text-3xl font-semibold text-white">{t('aiStudio.title')}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{t('aiStudio.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!hideBackButton && (
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-200 transition hover:border-indigo-300 hover:text-white"
              >
                {t('common.actions.backToDashboard')}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void loadProviders();
              }}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-indigo-300 hover:bg-indigo-500/10"
            >
              {providersLoading ? t('aiStudio.actions.loadingProviders') : t('aiStudio.actions.refreshProviders')}
            </button>
            <button
              type="button"
              onClick={() => {
                void runPipeline();
              }}
              disabled={runLoading || providersLoading}
              className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runLoading ? t('aiStudio.actions.running') : t('aiStudio.actions.run')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 xl:grid-cols-2">
        <section className="space-y-6">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <h2 className="text-lg font-semibold text-white">{t('aiStudio.material.title')}</h2>
            <p className="mt-1 text-sm text-slate-300">{t('aiStudio.material.subtitle')}</p>

            <div className="mt-5 grid gap-4">
              <label className="space-y-2 text-sm">
                <span className="text-slate-200">{t('aiStudio.material.fields.title')}</span>
                <input
                  type="text"
                  value={materialTitle}
                  onChange={(event) => setMaterialTitle(event.target.value)}
                  placeholder={t('aiStudio.material.placeholders.title')}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none ring-indigo-400 transition focus:border-indigo-300 focus:ring"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-slate-200">{t('aiStudio.material.fields.sourceUrl')}</span>
                <input
                  type="url"
                  value={materialSourceURL}
                  onChange={(event) => setMaterialSourceURL(event.target.value)}
                  placeholder={t('aiStudio.material.placeholders.sourceUrl')}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none ring-indigo-400 transition focus:border-indigo-300 focus:ring"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-slate-200">{t('aiStudio.material.fields.text')}</span>
                <textarea
                  value={materialText}
                  onChange={(event) => setMaterialText(event.target.value)}
                  placeholder={t('aiStudio.material.placeholders.text')}
                  rows={9}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none ring-indigo-400 transition focus:border-indigo-300 focus:ring"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-200">{t('aiStudio.material.fields.language')}</span>
                  <input
                    type="text"
                    value={materialLanguage}
                    onChange={(event) => setMaterialLanguage(event.target.value)}
                    placeholder={t('aiStudio.material.placeholders.language')}
                    className="w-full rounded-2xl border border-white/15 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none ring-indigo-400 transition focus:border-indigo-300 focus:ring"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-slate-200">{t('aiStudio.material.fields.note')}</span>
                  <input
                    type="text"
                    value={materialNote}
                    onChange={(event) => setMaterialNote(event.target.value)}
                    placeholder={t('aiStudio.material.placeholders.note')}
                    className="w-full rounded-2xl border border-white/15 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none ring-indigo-400 transition focus:border-indigo-300 focus:ring"
                  />
                </label>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <h2 className="text-lg font-semibold text-white">{t('aiStudio.generation.title')}</h2>
            <p className="mt-1 text-sm text-slate-300">{t('aiStudio.generation.subtitle')}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-slate-200">{t('aiStudio.generation.fields.variantsCount')}</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={variantsCount}
                  onChange={(event) => setVariantsCount(event.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none ring-indigo-400 transition focus:border-indigo-300 focus:ring"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-slate-200">{t('aiStudio.generation.fields.questionsPerVariant')}</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={questionsPerVariant}
                  onChange={(event) => setQuestionsPerVariant(event.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none ring-indigo-400 transition focus:border-indigo-300 focus:ring"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-slate-200">{t('aiStudio.generation.fields.difficulty')}</span>
                <input
                  type="text"
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value)}
                  placeholder={t('aiStudio.generation.placeholders.difficulty')}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none ring-indigo-400 transition focus:border-indigo-300 focus:ring"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-slate-200">{t('aiStudio.generation.fields.audience')}</span>
                <input
                  type="text"
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  placeholder={t('aiStudio.generation.placeholders.audience')}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none ring-indigo-400 transition focus:border-indigo-300 focus:ring"
                />
              </label>

              <label className="space-y-2 text-sm sm:col-span-2">
                <span className="text-slate-200">{t('aiStudio.generation.fields.outputLanguage')}</span>
                <input
                  type="text"
                  value={outputLanguage}
                  onChange={(event) => setOutputLanguage(event.target.value)}
                  placeholder={t('aiStudio.generation.placeholders.outputLanguage')}
                  className="w-full rounded-2xl border border-white/15 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none ring-indigo-400 transition focus:border-indigo-300 focus:ring"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={includeExplanations}
                  onChange={(event) => setIncludeExplanations(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-slate-900"
                />
                {t('aiStudio.generation.fields.includeExplanations')}
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={includePracticeTest}
                  onChange={(event) => setIncludePracticeTest(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-slate-900"
                />
                {t('aiStudio.generation.fields.includePracticeTest')}
              </label>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{t('aiStudio.providers.title')}</h2>
                <p className="mt-1 text-sm text-slate-300">{t('aiStudio.providers.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={setConfiguredOnlyMainOrder}
                disabled={!hasConfiguredProvider}
                className="rounded-xl border border-emerald-300/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('aiStudio.providers.useConfiguredOnly')}
              </button>
            </div>

            {providersError ? (
              <div className="mt-4 rounded-2xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {providersError}
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-indigo-200">{t('aiStudio.providers.available')}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {ALL_PROVIDERS.map((provider) => {
                  const status = providerStatusMap.get(provider);
                  return (
                    <div
                      key={`status-${provider}`}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs"
                    >
                      <p className="font-semibold text-slate-100">{prettifyProvider(provider)}</p>
                      <p className={`mt-1 ${status?.configured ? 'text-emerald-300' : 'text-yellow-300'}`}>
                        {status?.configured ? t('aiStudio.providers.configured') : t('aiStudio.providers.notConfigured')}
                      </p>
                      {status?.model ? <p className="mt-1 text-slate-400">{status.model}</p> : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-indigo-200">{t('aiStudio.providers.globalOrder')}</p>
              <div className="mt-3">{renderProviderPills(providerOrder, toggleProviderInMainOrder)}</div>
              <div className="mt-4">
                {renderOrderedList(
                  providerOrder,
                  (index, direction) => setProviderOrder((prev) => moveInOrder(prev, index, direction)),
                  (provider) => setProviderOrder((prev) => prev.filter((item) => item !== provider))
                )}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {ALL_LAYERS.map((layer) => {
                const layerConfig = layerOverrides[layer];
                return (
                  <div key={`layer-${layer}`} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">
                        {t('aiStudio.providers.layerOrder')} {prettifyLayer(layer)}
                      </p>
                      <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={layerConfig.enabled}
                          onChange={(event) => toggleLayerOverride(layer, event.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-slate-900"
                        />
                        {t('aiStudio.providers.customForLayer')}
                      </label>
                    </div>

                    {layerConfig.enabled ? (
                      <>
                        <div className="mt-3">
                          {renderProviderPills(layerConfig.order, (provider) => toggleProviderInLayerOrder(layer, provider))}
                        </div>
                        <div className="mt-4">
                          {renderOrderedList(
                            layerConfig.order,
                            (index, direction) =>
                              setLayerOverrides((prev) => ({
                                ...prev,
                                [layer]: {
                                  ...prev[layer],
                                  order: moveInOrder(prev[layer].order, index, direction)
                                }
                              })),
                            (provider) =>
                              setLayerOverrides((prev) => ({
                                ...prev,
                                [layer]: {
                                  ...prev[layer],
                                  order: prev[layer].order.filter((item) => item !== provider)
                                }
                              }))
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="mt-3 text-xs text-slate-400">{t('aiStudio.providers.layerFallbackHint')}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="space-y-6">
          {runError ? (
            <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {runError}
            </div>
          ) : null}

          {copyNotice ? (
            <div className="rounded-2xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
              {copyNotice}
            </div>
          ) : null}

          {!result ? (
            <article className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/5 px-8 py-10 text-center">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-indigo-200">{t('aiStudio.result.idleTag')}</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{t('aiStudio.result.idleTitle')}</h2>
                <p className="mt-2 max-w-lg text-sm text-slate-300">{t('aiStudio.result.idleDescription')}</p>
              </div>
            </article>
          ) : (
            <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">{t('aiStudio.result.title')}</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void copyToClipboard('final');
                    }}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 transition hover:border-indigo-300"
                  >
                    {t('aiStudio.actions.copyFinal')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void copyToClipboard('all');
                    }}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 transition hover:border-indigo-300"
                  >
                    {t('aiStudio.actions.copyAll')}
                  </button>
                  <button
                    type="button"
                    onClick={downloadResult}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 transition hover:border-indigo-300"
                  >
                    {t('aiStudio.actions.download')}
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                      activeTab === tab.key
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/35'
                        : 'border border-white/15 bg-white/5 text-slate-300 hover:border-indigo-300/50 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                {activeTab === 'final' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{t('aiStudio.final.teacherSummary')}</p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                            result.final.ready_for_use
                              ? 'border border-emerald-300/40 bg-emerald-500/20 text-emerald-100'
                              : 'border border-yellow-300/40 bg-yellow-500/20 text-yellow-100'
                          }`}
                        >
                          {result.final.ready_for_use ? t('aiStudio.final.ready') : t('aiStudio.final.notReady')}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-200">{result.final.teacher_summary}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{t('aiStudio.final.appliedFixes')}</p>
                        {result.final.applied_fixes.length ? (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                            {result.final.applied_fixes.map((item, index) => (
                              <li key={`fix-${index}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-slate-400">{t('aiStudio.final.none')}</p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{t('aiStudio.final.unresolvedWarnings')}</p>
                        {result.final.unresolved_warnings.length ? (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                            {result.final.unresolved_warnings.map((item, index) => (
                              <li key={`warn-${index}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-slate-400">{t('aiStudio.final.none')}</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{t('aiStudio.final.variants')}</p>
                      <div className="mt-3 space-y-2">
                        {result.final.test_variants.map((variant, index) => (
                          <details key={`variant-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <summary className="cursor-pointer text-sm font-semibold text-white">
                              {variant.title || `${t('aiStudio.final.variant')} ${index + 1}`} ({variant.questions.length})
                            </summary>
                            <p className="mt-2 text-sm text-slate-300">{variant.instructions}</p>
                            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-200">
                              {variant.questions.map((question, qIndex) => (
                                <li key={`vq-${index}-${qIndex}`}>{question.question}</li>
                              ))}
                            </ol>
                          </details>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{t('aiStudio.final.studyNotes')}</p>
                      <p className="mt-2 text-sm font-semibold text-white">{result.final.study_notes.title}</p>
                      <p className="mt-1 text-sm text-slate-300">{result.final.study_notes.summary}</p>
                      {result.final.study_notes.key_points?.length > 0 && (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                          {result.final.study_notes.key_points.map((point, index) => (
                            <li key={`kp-${index}`}>{point}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'validation' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{t('aiStudio.validation.alignment')}</p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                            result.validation.is_aligned
                              ? 'border border-emerald-300/40 bg-emerald-500/20 text-emerald-100'
                              : 'border border-red-300/40 bg-red-500/20 text-red-100'
                          }`}
                        >
                          {result.validation.is_aligned ? t('aiStudio.validation.aligned') : t('aiStudio.validation.notAligned')}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-200">
                        {t('aiStudio.validation.score', { score: result.validation.alignment_score })}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">{result.validation.summary}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{t('aiStudio.validation.missingTopics')}</p>
                        {result.validation.missing_topics.length > 0 ? (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                            {result.validation.missing_topics.map((topic, index) => (
                              <li key={`missing-${index}`}>{topic}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-slate-400">{t('aiStudio.final.none')}</p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{t('aiStudio.validation.extraTopics')}</p>
                        {result.validation.extra_topics.length > 0 ? (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                            {result.validation.extra_topics.map((topic, index) => (
                              <li key={`extra-${index}`}>{topic}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-slate-400">{t('aiStudio.final.none')}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-indigo-200">{t('aiStudio.validation.issues')}</p>
                      {renderValidationIssues(result.validation.issues)}
                    </div>
                  </div>
                )}

                {activeTab === 'plan' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <p className="text-sm font-semibold text-white">{t('aiStudio.plan.summary')}</p>
                      <p className="mt-2 text-sm text-slate-300">{result.plan.summary}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{t('aiStudio.plan.objectives')}</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
                          {result.plan.learning_objectives.map((objective, index) => (
                            <li key={`objective-${index}`}>{objective}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{t('aiStudio.plan.blueprint')}</p>
                        <p className="mt-2 text-sm text-slate-200">
                          {t('aiStudio.plan.blueprintVariants', {
                            count: result.plan.test_blueprint.variants_count
                          })}
                        </p>
                        <p className="mt-1 text-sm text-slate-200">
                          {t('aiStudio.plan.blueprintQuestions', {
                            count: result.plan.test_blueprint.questions_per_variant
                          })}
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                          {result.plan.test_blueprint.question_type_targets.map((target, index) => (
                            <li key={`target-${index}`}>
                              {target.type}: {target.count} ({target.focus})
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{t('aiStudio.plan.topicBlocks')}</p>
                      <div className="mt-2 space-y-2">
                        {result.plan.topic_blocks.map((block, index) => (
                          <div key={`block-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <p className="text-sm font-semibold text-white">
                              {block.topic} ({block.weight_percent}%)
                            </p>
                            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
                              {block.key_facts.map((fact, factIndex) => (
                                <li key={`fact-${index}-${factIndex}`}>{fact}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'draft' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{t('aiStudio.draft.variants')}</p>
                      <div className="mt-2 space-y-2">
                        {result.draft.test_variants.map((variant, index) => (
                          <details key={`draft-variant-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <summary className="cursor-pointer text-sm font-semibold text-white">
                              {variant.title || `${t('aiStudio.final.variant')} ${index + 1}`} ({variant.questions.length})
                            </summary>
                            <p className="mt-2 text-sm text-slate-300">{variant.instructions}</p>
                            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-200">
                              {variant.questions.map((question, qIndex) => (
                                <li key={`draft-q-${index}-${qIndex}`}>{question.question}</li>
                              ))}
                            </ol>
                          </details>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{t('aiStudio.draft.studyNotes')}</p>
                      <p className="mt-2 text-sm font-semibold text-white">{result.draft.study_notes.title}</p>
                      <p className="mt-1 text-sm text-slate-300">{result.draft.study_notes.summary}</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{t('aiStudio.draft.practiceTest')}</p>
                      <p className="mt-2 text-sm text-slate-200">
                        {result.draft.practice_test.title || t('aiStudio.draft.practiceUntitled')}
                      </p>
                      <p className="text-sm text-slate-300">
                        {t('aiStudio.draft.practiceQuestions', {
                          count: result.draft.practice_test.questions?.length ?? 0
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'trace' && renderTrace(result.provider_trace)}

                {activeTab === 'raw' && (
                  <pre className="max-h-[620px] overflow-auto rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs text-slate-200">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                )}
              </div>
            </article>
          )}
        </section>
      </main>
    </div>
  );
}
