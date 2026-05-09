import { useApp } from '../context/AppContext';
import { SectionHeader, StatusBadge, Icon } from '../components/ui';
import { AssetCard } from '../components/AssetCard';

import { useEffect, useState } from 'react';
import { usageApi } from '../api/usageApi';
import { qualityApi } from '../api/qualityApi';
import { providerBenchmarkApi } from '../api/providerBenchmarkApi';
import type { UsageSummary, QualitySummary, ProviderBenchmarkSummary } from '../types';

export function Dashboard() {
  const { assets, tasks, providers, projects, setView, setSelectedAsset, toggleFavorite, sendImageToVideo } = useApp();
  const running = tasks.filter((task) => task.status === 'running' || task.status === 'queued' || task.status === 'polling');
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [qualitySummary, setQualitySummary] = useState<QualitySummary | null>(null);
  const [benchmark, setBenchmark] = useState<ProviderBenchmarkSummary | null>(null);

  useEffect(() => {
    usageApi.getSummary({}).then(setSummary).catch(() => undefined);
    qualityApi.getSummary({}).then(setQualitySummary).catch(() => undefined);
    providerBenchmarkApi.getSummary({}, { tasks, providers, assets }).then(setBenchmark).catch(() => undefined);
  }, []);

  return (
    <div>
      <SectionHeader
        title="总览 Dashboard"
        subtitle="统一查看项目资产、供应商连接、生成任务与最近创作。"
        action={<button className="btn-primary" onClick={() => setView('image-studio')}><Icon name="add_circle" />新建图片任务</button>}
      />
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <div className="card">
          <Icon name="folder_open" className="text-primary-fixed-dim" />
          <p className="mt-3 text-sm text-on-surface-variant">项目数</p>
          <p className="text-3xl font-bold">{projects.length}</p>
        </div>
        <div className="card">
          <Icon name="inventory_2" className="text-primary-fixed-dim" />
          <p className="mt-3 text-sm text-on-surface-variant">资产数</p>
          <p className="text-3xl font-bold">{assets.length}</p>
        </div>
        <div className="card">
          <Icon name="pending" className="text-primary-fixed-dim" />
          <p className="mt-3 text-sm text-on-surface-variant">运行中任务</p>
          <p className="text-3xl font-bold">{running.length}</p>
        </div>
        <div className="card border-primary-fixed-dim/30 bg-primary-container/10">
          <div className="flex items-center justify-between">
            <Icon name="bar_chart" className="text-primary-fixed-dim" />
            <button className="text-xs text-primary-fixed-dim" onClick={() => setView('usage')}>查看用量账单</button>
          </div>
          <p className="mt-3 text-sm text-primary-fixed-dim">总估算费用</p>
          <p className="text-3xl font-bold text-primary-fixed-dim">
            {summary?.estimatedCostTotal ? `¥${summary.estimatedCostTotal.amount?.toFixed(2)}` : '--'}
          </p>
        </div>
      </div>
      {qualitySummary && qualitySummary.totalFeedback > 0 ? (
        <div className="mb-5 grid gap-4 md:grid-cols-4">
          <div className="card">
            <Icon name="star" className="text-yellow-400" />
            <p className="mt-3 text-sm text-on-surface-variant">平均评分</p>
            <p className="text-3xl font-bold">{qualitySummary.averageRating?.toFixed(1) ?? '--'}</p>
          </div>
          <div className="card">
            <Icon name="check_circle" className="text-success" />
            <p className="mt-3 text-sm text-on-surface-variant">优秀 / 可用</p>
            <p className="text-3xl font-bold text-success">{qualitySummary.excellentCount + qualitySummary.usableCount}</p>
          </div>
          <div className="card">
            <Icon name="warning" className="text-error" />
            <p className="mt-3 text-sm text-on-surface-variant">不可用</p>
            <p className="text-3xl font-bold text-error">{qualitySummary.unusableCount}</p>
          </div>
          <div className="card">
            <Icon name="replay" className="text-primary-fixed-dim" />
            <p className="mt-3 text-sm text-on-surface-variant">值得重试</p>
            <p className="text-3xl font-bold">{qualitySummary.worthRetryCount}</p>
          </div>
        </div>
      ) : null}
      {benchmark && benchmark.overall.totalTasks > 0 ? (
        <div className="mb-5 card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">供应商表现</h3>
            <button className="text-sm text-primary-fixed-dim" onClick={() => setView('provider-benchmark')}>
              <Icon name="analytics" className="mr-1" />进入供应商对比
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-surface-container-low p-4">
              <p className="text-xs text-on-surface-variant">任务最多</p>
              <p className="mt-1 font-bold">
                {(() => {
                  const list = [...benchmark.byProvider].sort((a, b) => b.totalTasks - a.totalTasks);
                  return list[0] ? `${list[0].providerName} (${list[0].totalTasks} 任务)` : '--';
                })()}
              </p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <p className="text-xs text-on-surface-variant">成功率最高</p>
              <p className="mt-1 font-bold text-success">
                {(() => {
                  const list = benchmark.byProvider.filter((p) => p.totalTasks >= 2).sort((a, b) => b.successRate - a.successRate);
                  return list[0] ? `${list[0].providerName} (${list[0].successRate.toFixed(1)}%)` : '数据不足';
                })()}
              </p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <p className="text-xs text-on-surface-variant">平均评分最高</p>
              <p className="mt-1 font-bold text-yellow-400">
                {(() => {
                  const withRating = benchmark.byProvider.filter((p) => p.averageRating !== undefined && p.totalTasks >= 2).sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
                  return withRating[0] ? `${withRating[0].providerName} (${withRating[0].averageRating?.toFixed(2)})` : '暂无评价';
                })()}
              </p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <p className="text-xs text-on-surface-variant">失败率最高</p>
              <p className="mt-1 font-bold text-error">
                {(() => {
                  const list = benchmark.byProvider.filter((p) => p.totalTasks >= 2).sort((a, b) => b.failureRate - a.failureRate);
                  return list[0] ? `${list[0].providerName} (${list[0].failureRate.toFixed(1)}%)` : '数据不足';
                })()}
              </p>
            </div>
          </div>
        </div>
      ) : benchmark ? (
        <div className="mb-5 card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">供应商表现</h3>
            <button className="text-sm text-primary-fixed-dim" onClick={() => setView('provider-benchmark')}>
              <Icon name="analytics" className="mr-1" />进入供应商对比
            </button>
          </div>
          <p className="text-sm text-on-surface-variant">暂无足够数据，完成更多真实任务并评价后可查看供应商表现。</p>
        </div>
      ) : null}
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">进行中任务</h3>
            <button className="text-sm text-primary-fixed-dim" onClick={() => setView('tasks')}>查看全部</button>
          </div>
          <div className="space-y-3">
            {running.length ? running.slice(0, 3).map((task) => (
              <div key={task.id} className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{task.title}</p>
                    <p className="text-xs text-on-surface-variant">{task.providerName} · {task.model} · {task.projectName}</p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
                <div className="mt-3 h-2 rounded-full bg-surface-container-high">
                  <div className="h-full rounded-full bg-primary-fixed-dim" style={{ width: `${task.progress}%` }} />
                </div>
              </div>
            )) : <p className="text-sm text-on-surface-variant">暂无运行中任务，生成图片或视频后会在这里显示。</p>}
          </div>
        </section>
        <section className="card">
          <h3 className="mb-4 text-xl font-bold">API 状态</h3>
          <div className="space-y-3">
            {providers.slice(0, 5).map((provider) => (
              <div key={provider.id} className="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                <span className="font-semibold">{provider.name}</span>
                <StatusBadge status={provider.status} />
              </div>
            ))}
          </div>
        </section>
      </div>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">最近生成资产</h3>
          <button className="text-sm text-primary-fixed-dim" onClick={() => setView('assets')}>进入资产库</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {assets.slice(0, 4).map((asset) => (
            <AssetCard key={asset.id} asset={asset} onSelect={setSelectedAsset} onFavorite={toggleFavorite} onSendToVideo={(id) => sendImageToVideo(id, 'i2v-first')} />
          ))}
        </div>
      </section>
    </div>
  );
}
