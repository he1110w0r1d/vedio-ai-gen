import { useEffect, useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { providerBenchmarkApi } from '../api/providerBenchmarkApi';
import { SectionHeader, Icon, EmptyState } from '../components/ui';
import type { ProviderBenchmarkSummary, ProviderBenchmarkRow, ProviderBenchmarkFilters } from '../types';

const MODE_LABELS: Record<string, string> = {
  image: '图片生成',
  t2v: 'T2V 视频',
  i2v: 'I2V 视频',
  r2v: 'R2V 视频',
  mock: 'Mock 数据',
};

const FAILURE_CATEGORY_LABELS: Record<string, string> = {
  prompt_issue: '提示词问题',
  model_issue: '模型问题',
  provider_error: '供应商错误',
  content_rejected: '内容被拒',
  technical_error: '技术错误',
  bad_composition: '构图不佳',
  bad_motion: '动作不佳',
  identity_drift: '角色漂移',
  style_mismatch: '风格不匹配',
  low_resolution: '分辨率低',
  artifact: '画面瑕疵',
  other: '其他',
};

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatCost(value?: number): string {
  if (value === undefined || value === 0) return '--';
  return `¥${value.toFixed(2)}`;
}

function formatDuration(seconds?: number): string {
  if (seconds === undefined) return '--';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function formatRating(value?: number): string {
  if (value === undefined) return '--';
  return value.toFixed(2);
}

function rateColor(value: number): string {
  if (value >= 80) return 'text-success';
  if (value >= 50) return 'text-yellow-400';
  return 'text-error';
}

type SortKey = 'successRate' | 'failureRate' | 'averageRating' | 'totalEstimatedCost' | 'averageTaskDurationSeconds' | 'totalTasks';
type SortDir = 'asc' | 'desc';

function sortRows(rows: ProviderBenchmarkRow[], key: SortKey, dir: SortDir): ProviderBenchmarkRow[] {
  return [...rows].sort((a, b) => {
    const va = a[key] ?? 0;
    const vb = b[key] ?? 0;
    if (typeof va === 'number' && typeof vb === 'number') {
      return dir === 'desc' ? vb - va : va - vb;
    }
    return 0;
  });
}

type InsightItem = { type: 'warning' | 'info' | 'success'; text: string };

function generateInsights(summary: ProviderBenchmarkSummary): InsightItem[] {
  const insights: InsightItem[] = [];
  const { byProvider, byModel, overall } = summary;

  // Kling gateway disclaimer is always present
  insights.push({
    type: 'info',
    text: 'Kling 当前通过兼容网关接入，非官方 Kling API。建议完成 live test 后评估稳定性。',
  });

  // Sample size warning
  if (overall.totalTasks < 5) {
    insights.push({
      type: 'warning',
      text: `当前仅 ${overall.totalTasks} 个任务，样本量不足。建议完成更多真实任务后再判断供应商优劣。`,
    });
  }

  // No cost data
  if (overall.totalEstimatedCost === undefined || overall.totalEstimatedCost === 0) {
    insights.push({
      type: 'info',
      text: '成本统计仅供参考。部分任务未配置估算规则，实际费用以供应商控制台为准。',
    });
  }

  // Unreviewed count
  if (overall.unreviewedCount > 0) {
    insights.push({
      type: 'info',
      text: `${overall.unreviewedCount} 个任务尚未质量评价，评价后可获得更准确的对比数据。`,
    });
  }

  // Best performer
  const providersWithRating = byProvider.filter((p) => p.averageRating !== undefined && p.totalTasks >= 2);
  const bestRated = providersWithRating.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))[0];
  if (bestRated) {
    insights.push({
      type: 'success',
      text: `${bestRated.providerName || '某供应商'} 平均评分最高 (${formatRating(bestRated.averageRating)})，模型 ${bestRated.model || '--'} 可优先复用。`,
    });
  }

  // High failure rate provider
  const highFailureProviders = byProvider.filter((p) => p.totalTasks >= 3 && p.failureRate >= 30);
  if (highFailureProviders.length > 0) {
    insights.push({
      type: 'warning',
      text: `${highFailureProviders.map((p) => p.providerName).join('、')} 失败率较高，缺少质量评价，建议增加评价后判断。`,
    });
  }

  // Low sample Kling
  const klingRow = byProvider.find((p) => p.providerName?.toLowerCase().includes('kling'));
  if (klingRow && klingRow.totalTasks < 3) {
    insights.push({
      type: 'info',
      text: 'Kling T2V 当前样本较少，建议先完成 live test 后再判断是否可扩展 I2V/R2V。',
    });
  }

  // Best model suggestion
  const modelsWithRating = byModel.filter((m) => m.averageRating !== undefined && m.totalTasks >= 2);
  const bestModel = modelsWithRating.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))[0];
  if (bestModel) {
    insights.push({
      type: 'success',
      text: `${bestModel.providerName || '--'} / ${bestModel.model || '--'} 平均评分较高，可优先复用该模型。`,
    });
  }

  return insights;
}

export function ProviderBenchmark() {
  const { projects, providers, tasks, assets, setView } = useApp();
  const [summary, setSummary] = useState<ProviderBenchmarkSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('totalTasks');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [modelSortKey, setModelSortKey] = useState<SortKey>('totalTasks');
  const [modelSortDir, setModelSortDir] = useState<SortDir>('desc');
  const [activeTab, setActiveTab] = useState<'providers' | 'models' | 'modes'>('providers');

  // Filters
  const [filterProject, setFilterProject] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [filterProviderType, setFilterProviderType] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: ProviderBenchmarkFilters = {
        projectId: filterProject || undefined,
        providerId: filterProvider || undefined,
        providerType: filterProviderType || undefined,
        mode: filterMode || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
      };
      const data = await providerBenchmarkApi.getSummary(filters, { tasks, providers, assets });
      setSummary(data);
    } catch {
      // Silently handle - empty state will show
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterProject, filterProvider, filterProviderType, filterMode, filterDateFrom, filterDateTo]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const toggleModelSort = (key: SortKey) => {
    if (modelSortKey === key) {
      setModelSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setModelSortKey(key);
      setModelSortDir('desc');
    }
  };

  const sortedProviders = useMemo(() => {
    if (!summary) return [];
    return sortRows(summary.byProvider, sortKey, sortDir);
  }, [summary, sortKey, sortDir]);

  const sortedModels = useMemo(() => {
    if (!summary) return [];
    return sortRows(summary.byModel, modelSortKey, modelSortDir);
  }, [summary, modelSortKey, modelSortDir]);

  const insights = useMemo(() => {
    if (!summary) return [];
    return generateInsights(summary);
  }, [summary]);

  const SortArrow = ({ col }: { col: SortKey }) => {
    const active = (activeTab === 'providers' ? sortKey : modelSortKey) === col;
    const dir = activeTab === 'providers' ? sortDir : modelSortDir;
    if (!active) return <Icon name="unfold_more" className="ml-1 text-[10px] text-on-surface-variant" />;
    return <Icon name={dir === 'desc' ? 'arrow_drop_down' : 'arrow_drop_up'} className="ml-1 text-[14px] text-primary-fixed-dim" />;
  };

  const SortableTh = ({ col, label, tab }: { col: SortKey; label: string; tab?: 'providers' | 'models' }) => {
    const t = tab ?? activeTab;
    const handleClick = t === 'providers' ? () => toggleSort(col) : () => toggleModelSort(col);
    return (
      <th className="cursor-pointer select-none pb-3 pr-4 font-normal whitespace-nowrap hover:text-primary-fixed-dim" onClick={handleClick}>
        {label}<SortArrow col={col} />
      </th>
    );
  };

  const renderRow = (row: ProviderBenchmarkRow, key: string) => (
    <tr key={key} className="border-b border-outline-variant/20 hover:bg-surface-container-low/50">
      <td className="py-3 pr-4 font-semibold">{row.providerName || '--'}</td>
      <td className="py-3 pr-4 text-sm text-on-surface-variant">{row.providerType || '--'}</td>
      <td className="py-3 pr-4 text-sm text-on-surface-variant">
        {row.mode ? MODE_LABELS[row.mode] ?? row.mode : '--'}
      </td>
      <td className="py-3 pr-4">{row.totalTasks}</td>
      <td className={`py-3 pr-4 font-semibold ${rateColor(row.successRate)}`}>{formatPercent(row.successRate)}</td>
      <td className={`py-3 pr-4 font-semibold ${rateColor(100 - row.failureRate)}`}>{formatPercent(row.failureRate)}</td>
      <td className="py-3 pr-4 text-sm">{formatDuration(row.averageTaskDurationSeconds)}</td>
      <td className="py-3 pr-4 font-semibold text-yellow-400">{formatRating(row.averageRating)}</td>
      <td className="py-3 pr-4">{formatCost(row.totalEstimatedCost)}</td>
      <td className={`py-3 pr-4 ${row.wastedEstimatedCost ? 'text-error' : ''}`}>{formatCost(row.wastedEstimatedCost)}</td>
      <td className="py-3 pr-4 text-sm text-on-surface-variant">{row.topFailureCategory ? FAILURE_CATEGORY_LABELS[row.topFailureCategory] ?? row.topFailureCategory : '--'}</td>
      <td className="py-3">
        <div className="flex gap-1">
          <button className="btn-ghost text-xs" onClick={() => { setView('tasks'); }} title="查看任务">任务</button>
          <button className="btn-ghost text-xs" onClick={() => { setView('assets'); }} title="查看资产">资产</button>
        </div>
      </td>
    </tr>
  );

  const providerTypeOptions = useMemo(() => {
    const types = new Set(providers.map((p) => p.providerType).filter(Boolean));
    return Array.from(types);
  }, [providers]);

  return (
    <div>
      <SectionHeader
        title="供应商对比 Provider Benchmark"
        subtitle="基于本地任务、用量台账和人工质量评价，对不同供应商和模型进行多维度对比。"
      />

      {/* Disclaimer Banner */}
      <div className="mb-6 rounded-xl border border-primary-container/30 bg-primary-container/8 p-4">
        <div className="flex items-start gap-2">
          <Icon name="info" className="mt-0.5 text-primary-fixed-dim" />
          <div>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              本页基于本地任务、用量台账和人工质量评价，对不同供应商和模型进行对比。成本为估算值，实际费用以供应商控制台为准。
              <strong className="text-primary-fixed-dim"> Kling 当前通过兼容网关接入，非官方 Kling API。</strong>
            </p>
            <button className="btn-secondary mt-2 text-xs" onClick={() => setView('benchmarks')}>
              <Icon name="science" /> 查看基准测试
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <select className="field max-w-[160px]" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="">所有项目</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="field max-w-[180px]" value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)}>
          <option value="">所有供应商</option>
          {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="field max-w-[150px]" value={filterProviderType} onChange={(e) => setFilterProviderType(e.target.value)}>
          <option value="">所有类型</option>
          {providerTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="field max-w-[150px]" value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>
          <option value="">所有模式</option>
          <option value="image">图片生成</option>
          <option value="t2v">T2V 文生视频</option>
          <option value="i2v">I2V 图生视频</option>
          <option value="r2v">R2V 参考视频</option>
        </select>
        <input
          type="date"
          className="field max-w-[160px]"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          placeholder="起始日期"
        />
        <input
          type="date"
          className="field max-w-[160px]"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          placeholder="截止日期"
        />
        <button className="btn-ghost" onClick={loadData}><Icon name="refresh" />刷新</button>
      </div>

      {loading ? (
        <div className="card flex min-h-40 items-center justify-center gap-3 text-on-surface-variant">
          <Icon name="refresh" className="animate-spin text-primary-fixed-dim" />
          正在加载供应商统计数据...
        </div>
      ) : !summary || summary.overall.totalTasks === 0 ? (
        <EmptyState
          icon="analytics"
          title="暂无统计数据"
          text="尚未有足够的任务数据可供对比。请先生成一些图片或视频任务后再查看。"
          action={<button className="btn-primary" onClick={() => setView('image-studio')}>去生成图片</button>}
        />
      ) : (
        <div className="grid gap-5">
          {/* Overall Stats Cards */}
          <div className="grid gap-4 md:grid-cols-6">
            <div className="card">
              <p className="text-sm text-on-surface-variant">总任务数</p>
              <p className="text-3xl font-bold">{summary.overall.totalTasks}</p>
              <p className="mt-1 text-xs text-on-surface-variant">{summary.overall.reviewedCount} 已评价/{summary.overall.unreviewedCount} 未评价</p>
            </div>
            <div className="card">
              <p className="text-sm text-on-surface-variant">成功率</p>
              <p className={`text-3xl font-bold ${rateColor(summary.overall.successRate)}`}>
                {formatPercent(summary.overall.successRate)}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">{summary.overall.completedTasks} 完成 / {summary.overall.failedTasks} 失败</p>
            </div>
            <div className="card">
              <p className="text-sm text-on-surface-variant">平均耗时</p>
              <p className="text-3xl font-bold">{formatDuration(summary.overall.averageDurationSeconds)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-on-surface-variant">平均评分</p>
              <p className="text-3xl font-bold text-yellow-400">{formatRating(summary.overall.averageRating)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-on-surface-variant">估算成本</p>
              <p className="text-3xl font-bold text-primary-fixed-dim">{formatCost(summary.overall.totalEstimatedCost)}</p>
              <p className="mt-1 text-xs text-on-surface-variant">部分未配置规则</p>
            </div>
            <div className="card">
              <p className="text-sm text-on-surface-variant">浪费成本</p>
              <p className={`text-3xl font-bold ${summary.overall.wastedEstimatedCost ? 'text-error' : ''}`}>
                {formatCost(summary.overall.wastedEstimatedCost)}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">失败+不可用任务</p>
            </div>
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
                    insight.type === 'warning'
                      ? 'border-warning/30 bg-warning/8 text-warning'
                      : insight.type === 'success'
                        ? 'border-success/30 bg-success/8 text-success'
                        : 'border-primary-container/30 bg-primary-container/8 text-on-surface-variant'
                  }`}
                >
                  <Icon name={insight.type === 'warning' ? 'warning' : insight.type === 'success' ? 'check_circle' : 'info'} className="mt-0.5 shrink-0" />
                  <span>{insight.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tabbed Tables */}
          <div className="card p-0">
            <div className="flex border-b border-outline-variant/30">
              {(['providers', 'models', 'modes'] as const).map((tab) => (
                <button
                  key={tab}
                  className={`px-5 py-3 text-sm font-semibold transition ${
                    activeTab === tab
                      ? 'border-b-2 border-primary-fixed-dim text-primary-fixed-dim'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'providers' ? '供应商对比' : tab === 'models' ? '模型对比' : '模式统计'}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto p-4">
              {activeTab === 'providers' && (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-on-surface-variant">
                      <th className="pb-3 pr-4 font-normal">供应商</th>
                      <th className="pb-3 pr-4 font-normal">类型</th>
                      <th className="pb-3 pr-4 font-normal">模式</th>
                      <SortableTh col="totalTasks" label="任务数" />
                      <SortableTh col="successRate" label="成功率" />
                      <SortableTh col="failureRate" label="失败率" />
                      <SortableTh col="averageTaskDurationSeconds" label="平均耗时" />
                      <SortableTh col="averageRating" label="平均评分" />
                      <SortableTh col="totalEstimatedCost" label="估算成本" />
                      <th className="pb-3 pr-4 font-normal">浪费成本</th>
                      <th className="pb-3 pr-4 font-normal">主要失败原因</th>
                      <th className="pb-3 font-normal">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {sortedProviders.map((row, idx) => renderRow(row, `prov-${idx}`))}
                    {sortedProviders.length === 0 && (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-on-surface-variant">暂无匹配数据</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'models' && (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-on-surface-variant">
                      <th className="pb-3 pr-4 font-normal">供应商</th>
                      <th className="pb-3 pr-4 font-normal">模型</th>
                      <th className="pb-3 pr-4 font-normal">模式</th>
                      <SortableTh col="totalTasks" label="任务数" tab="models" />
                      <SortableTh col="successRate" label="成功率" tab="models" />
                      <SortableTh col="failureRate" label="失败率" tab="models" />
                      <SortableTh col="averageTaskDurationSeconds" label="平均耗时" tab="models" />
                      <SortableTh col="averageRating" label="平均评分" tab="models" />
                      <SortableTh col="totalEstimatedCost" label="估算成本" tab="models" />
                      <th className="pb-3 pr-4 font-normal">浪费成本</th>
                      <th className="pb-3 font-normal">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {sortedModels.map((row, idx) => (
                      <tr key={`model-${idx}`} className="border-b border-outline-variant/20 hover:bg-surface-container-low/50">
                        <td className="py-3 pr-4 font-semibold">{row.providerName || '--'}</td>
                        <td className="py-3 pr-4 text-sm">{row.model || '--'}</td>
                        <td className="py-3 pr-4 text-sm text-on-surface-variant">
                          {row.mode ? MODE_LABELS[row.mode] ?? row.mode : '--'}
                        </td>
                        <td className="py-3 pr-4">{row.totalTasks}</td>
                        <td className={`py-3 pr-4 font-semibold ${rateColor(row.successRate)}`}>{formatPercent(row.successRate)}</td>
                        <td className={`py-3 pr-4 font-semibold ${rateColor(100 - row.failureRate)}`}>{formatPercent(row.failureRate)}</td>
                        <td className="py-3 pr-4 text-sm">{formatDuration(row.averageTaskDurationSeconds)}</td>
                        <td className="py-3 pr-4 font-semibold text-yellow-400">{formatRating(row.averageRating)}</td>
                        <td className="py-3 pr-4">{formatCost(row.totalEstimatedCost)}</td>
                        <td className={`py-3 pr-4 ${row.wastedEstimatedCost ? 'text-error' : ''}`}>{formatCost(row.wastedEstimatedCost)}</td>
                        <td className="py-3">
                          <button className="btn-ghost text-xs" onClick={() => { setView('tasks'); }}>任务</button>
                        </td>
                      </tr>
                    ))}
                    {sortedModels.length === 0 && (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-on-surface-variant">暂无匹配数据</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'modes' && (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-on-surface-variant">
                      <th className="pb-3 pr-4 font-normal">模式</th>
                      <th className="pb-3 pr-4 font-normal">任务数</th>
                      <th className="pb-3 pr-4 font-normal">成功率</th>
                      <th className="pb-3 pr-4 font-normal">失败率</th>
                      <th className="pb-3 pr-4 font-normal">平均耗时</th>
                      <th className="pb-3 pr-4 font-normal">平均评分</th>
                      <th className="pb-3 pr-4 font-normal">估算成本</th>
                      <th className="pb-3 font-normal">浪费成本</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {summary.byMode.map((row, idx) => (
                      <tr key={`mode-${idx}`} className="border-b border-outline-variant/20 hover:bg-surface-container-low/50">
                        <td className="py-3 pr-4 font-semibold">{MODE_LABELS[row.mode ?? ''] ?? row.mode}</td>
                        <td className="py-3 pr-4">{row.totalTasks}</td>
                        <td className={`py-3 pr-4 font-semibold ${rateColor(row.successRate)}`}>{formatPercent(row.successRate)}</td>
                        <td className={`py-3 pr-4 font-semibold ${rateColor(100 - row.failureRate)}`}>{formatPercent(row.failureRate)}</td>
                        <td className="py-3 pr-4 text-sm">{formatDuration(row.averageTaskDurationSeconds)}</td>
                        <td className="py-3 pr-4 font-semibold text-yellow-400">{formatRating(row.averageRating)}</td>
                        <td className="py-3 pr-4">{formatCost(row.totalEstimatedCost)}</td>
                        <td className={`py-3 pr-4 ${row.wastedEstimatedCost ? 'text-error' : ''}`}>{formatCost(row.wastedEstimatedCost)}</td>
                      </tr>
                    ))}
                    {summary.byMode.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-on-surface-variant">暂无匹配数据</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Failure Category Distribution */}
          {summary.failureCategories.length > 0 && (
            <section className="card">
              <h3 className="mb-4 text-lg font-bold">失败原因分布</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-on-surface-variant">
                      <th className="pb-3 pr-4 font-normal">失败分类</th>
                      <th className="pb-3 pr-4 font-normal">数量</th>
                      <th className="pb-3 font-normal">估算浪费成本</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {summary.failureCategories.map((cat) => (
                      <tr key={cat.category} className="border-b border-outline-variant/20 hover:bg-surface-container-low/50">
                        <td className="py-3 pr-4 font-semibold">{FAILURE_CATEGORY_LABELS[cat.category] ?? cat.category}</td>
                        <td className={`py-3 pr-4 font-bold text-error`}>{cat.count}</td>
                        <td className={`py-3 pr-4 ${cat.estimatedCost ? 'text-error' : ''}`}>{formatCost(cat.estimatedCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Quality-Cost Cross Analysis */}
          {summary.byProvider.length > 0 && (
            <section className="card">
              <h3 className="mb-4 text-lg font-bold">质量成本交叉分析</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-on-surface-variant">
                      <th className="pb-3 pr-4 font-normal">供应商</th>
                      <th className="pb-3 pr-4 font-normal">总任务</th>
                      <th className="pb-3 pr-4 font-normal">优秀</th>
                      <th className="pb-3 pr-4 font-normal">可用</th>
                      <th className="pb-3 pr-4 font-normal">需修复</th>
                      <th className="pb-3 pr-4 font-normal">不可用</th>
                      <th className="pb-3 pr-4 font-normal">值得重试</th>
                      <th className="pb-3 pr-4 font-normal">平均评分</th>
                      <th className="pb-3 font-normal">浪费成本</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {summary.byProvider.map((row, idx) => (
                      <tr key={`qa-${idx}`} className="border-b border-outline-variant/20 hover:bg-surface-container-low/50">
                        <td className="py-3 pr-4 font-semibold">{row.providerName || '--'}</td>
                        <td className="py-3 pr-4">{row.totalTasks}</td>
                        <td className="py-3 pr-4 text-success">{row.excellentCount}</td>
                        <td className="py-3 pr-4 text-primary-fixed-dim">{row.usableCount}</td>
                        <td className="py-3 pr-4 text-yellow-400">{row.needsFixCount}</td>
                        <td className="py-3 pr-4 text-error">{row.unusableCount}</td>
                        <td className="py-3 pr-4">{row.worthRetryCount}</td>
                        <td className="py-3 pr-4 font-semibold text-yellow-400">{formatRating(row.averageRating)}</td>
                        <td className={`py-3 pr-4 ${row.wastedEstimatedCost ? 'text-error' : ''}`}>{formatCost(row.wastedEstimatedCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
