import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { benchmarkApi } from '../api/benchmarkApi';
import type { BenchmarkSet, BenchmarkRun, BenchmarkRunItem, BenchmarkRunSummary, BenchmarkCase, BenchmarkMode } from '../api/benchmarkApi';
import { SectionHeader, Icon, EmptyState } from '../components/ui';

const MODE_LABELS: Record<string, string> = {
  t2v: 'T2V',
  i2v: 'I2V',
  r2v: 'R2V',
};

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  canceled: '已取消',
};

const ITEM_STATUS_LABELS: Record<string, string> = {
  pending: '等待中',
  created: '已创建',
  completed: '已完成',
  failed: '失败',
  skipped: '已跳过',
};

function countByMode(cases: BenchmarkCase[], mode: string): number {
  return cases.filter(c => c.mode === mode).length;
}

function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' | 'warning' | 'error' | 'info' }) {
  const colors: Record<string, string> = {
    default: 'bg-white/10 text-on-surface-variant',
    success: 'bg-success/20 text-success',
    warning: 'bg-yellow-500/20 text-yellow-400',
    error: 'bg-error/20 text-error',
    info: 'bg-primary/20 text-primary-fixed-dim',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs ${colors[tone]}`}>{label}</span>;
}

export function Benchmarks() {
  const { providers, currentProject, showToast, assets, tasks, setView } = useApp();
  const [sets, setSets] = useState<BenchmarkSet[]>([]);
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [selectedSet, setSelectedSet] = useState<BenchmarkSet | null>(null);
  const [selectedRun, setSelectedRun] = useState<BenchmarkRun | null>(null);
  const [runItems, setRunItems] = useState<BenchmarkRunItem[]>([]);
  const [runSummary, setRunSummary] = useState<BenchmarkRunSummary | null>(null);
  const [showNewSet, setShowNewSet] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [runName, setRunName] = useState('');
  const [liveRun, setLiveRun] = useState(false);
  const [confirmLiveRun, setConfirmLiveRun] = useState(false);
  const [viewTab, setViewTab] = useState<'sets' | 'runs'>('sets');

  const loadSets = async () => {
    try {
      const data = await benchmarkApi.listBenchmarkSets();
      setSets(data);
    } catch (e: any) { showToast(e?.message ?? '加载失败', 'error'); }
  };

  const loadRuns = async () => {
    try {
      const data = await benchmarkApi.listBenchmarkRuns();
      setRuns(data);
    } catch (e: any) { showToast(e?.message ?? '加载失败', 'error'); }
  };

  useEffect(() => { loadSets(); loadRuns(); }, []);

  const openSet = (set: BenchmarkSet) => setSelectedSet(set.id === selectedSet?.id ? null : set);
  const openRun = async (run: BenchmarkRun) => {
    if (selectedRun?.id === run.id) { setSelectedRun(null); setRunItems([]); setRunSummary(null); return; }
    try {
      const { items } = await benchmarkApi.getBenchmarkRun(run.id);
      const summary = await benchmarkApi.getBenchmarkRunSummary(run.id);
      setSelectedRun(run); setRunItems(items); setRunSummary(summary);
    } catch (e: any) { showToast(e?.message ?? '加载失败', 'error'); }
  };

  const createRun = async () => {
    if (!selectedSet || selectedProviderIds.length === 0) { showToast('请选择 Benchmark Set 和至少一个供应商', 'error'); return; }
    try {
      const run = await benchmarkApi.createBenchmarkRun({
        setId: selectedSet.id, name: runName || `Run ${new Date().toLocaleString('zh-CN')}`, providerIds: selectedProviderIds, liveRun,
      });
      showToast('Benchmark Run 已创建', 'success');
      setShowRunDialog(false); setLiveRun(false); setConfirmLiveRun(false); setRunName('');
      await loadRuns();
    } catch (e: any) { showToast(e?.message ?? '创建失败', 'error'); }
  };

  const startRun = async (runId: string) => {
    if (!confirmLiveRun) { showToast('请确认真实运行将产生费用', 'error'); return; }
    try {
      const result = await benchmarkApi.startBenchmarkRun(runId, true);
      if (result.warning) { showToast(result.warning, 'error'); return; }
      showToast('Benchmark Run 已启动', 'success');
      await loadRuns();
    } catch (e: any) { showToast(e?.message ?? '启动失败', 'error'); }
  };

  const cancelRun = async (runId: string) => {
    try {
      await benchmarkApi.cancelBenchmarkRun(runId);
      showToast('Run 已取消', 'info');
      await loadRuns();
    } catch (e: any) { showToast(e?.message ?? '取消失败', 'error'); }
  };

  const navigateToTask = (taskId: string) => {
    setView('tasks');
    window.setTimeout(() => {
      const el = document.querySelector(`[data-task-id="${taskId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  };

  const navigateToAsset = (assetId: string) => {
    setView('assets');
    window.setTimeout(() => {
      const el = document.querySelector(`[data-asset-id="${assetId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  };

  // Auto-refresh run details when tasks/assets change
  useEffect(() => {
    if (!selectedRun) return;
    // Re-load run items to catch task→asset sync
    const refreshInterval = window.setInterval(async () => {
      try {
        const { items } = await benchmarkApi.getBenchmarkRun(selectedRun.id);
        setRunItems(items);
        const summary = await benchmarkApi.getBenchmarkRunSummary(selectedRun.id);
        setRunSummary(summary);
      } catch { /* silently skip */ }
    }, 3000);
    return () => window.clearInterval(refreshInterval);
  }, [selectedRun]);

  const findAsset = (item: BenchmarkRunItem) => assets.find(a => {
    if (item.assetId) return a.id === item.assetId;
    if (item.taskId) {
      const t = tasks.find(tt => tt.id === item.taskId);
      if (t) return assets.find(aa => aa.taskId === t.id);
    }
    return false;
  });

  return (
    <div>
      <SectionHeader title="基准测试" subtitle="用同一批 prompt、参考图和参数比较不同模型/供应商表现。真实运行会产生供应商费用，成本以供应商控制台为准。" />

      {/* Info Banner */}
      <div className="mb-5 rounded-xl border border-primary-container/20 bg-primary-container/5 p-4">
        <div className="flex items-start gap-3">
          <Icon name="info" className="mt-0.5 text-primary-fixed-dim" />
          <div className="text-sm text-on-surface-variant">
            <p className="font-medium text-primary-fixed-dim">基准测试用途说明</p>
            <p className="mt-1">
              Benchmark Set 包含标准化的 prompt、参数和评价 rubric。
              dry-run（默认）不调用真实供应商，仅创建测试记录。
              <strong> live-run 会产生供应商费用</strong>，需要二次确认后才能执行。
              后续人工评测质量后，结果自动汇入 Usage、Quality 和 Provider Benchmark。
            </p>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="mb-4 flex gap-2">
        <button className={`btn ${viewTab === 'sets' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewTab('sets')}>测试集 ({sets.length})</button>
        <button className={`btn ${viewTab === 'runs' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewTab('runs')}>运行记录 ({runs.length})</button>
      </div>

      {/* ── Benchmark Sets View ── */}
      {viewTab === 'sets' && (
        <div className="space-y-4">
          {sets.length === 0 ? (
            <EmptyState icon="science" title="暂无 Benchmark Set" text="创建第一个基准测试集" />
          ) : sets.map(set => (
            <div key={set.id} className="card">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => openSet(set)}>
                <div>
                  <h3 className="text-lg font-bold text-primary-fixed-dim">{set.name}</h3>
                  <div className="mt-1 flex gap-2 text-xs text-on-surface-variant">
                    <span>v{set.version}</span>
                    <span>· {set.cases.length} 个用例</span>
                    <span>· T2V: {countByMode(set.cases, 't2v')}</span>
                    <span>· I2V: {countByMode(set.cases, 'i2v')}</span>
                    <span>· R2V: {countByMode(set.cases, 'r2v')}</span>
                  </div>
                  {set.description && <p className="mt-1 text-xs text-on-surface-variant">{set.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary text-xs" onClick={(e) => { e.stopPropagation(); setSelectedSet(set); setShowRunDialog(true); }}>
                    <Icon name="play_arrow" /> 创建 Run
                  </button>
                </div>
              </div>

              {selectedSet?.id === set.id && (
                <div className="mt-4 border-t border-outline-variant/30 pt-4 space-y-3">
                  <h4 className="text-sm font-bold text-primary-fixed-dim">用例列表</h4>
                  {set.cases.map(c => {
                    const rubricItem = (item: BenchmarkRunItem | undefined) => {
                      if (!item?.taskId) return null;
                      const task = tasks.find(t => t.id === item.taskId);
                      const asset = findAsset(item);
                      return (
                        <div className="mt-1 flex items-center gap-2 text-xs text-on-surface-variant">
                          {task && <Badge label={task.status} tone={task.status === 'completed' ? 'success' : task.status === 'failed' ? 'error' : 'default'} />}
                          {asset && <span className="truncate max-w-32">{asset.title}</span>}
                        </div>
                      );
                    };
                    return (
                      <div key={c.id} className="rounded-lg border border-outline-variant/20 bg-surface-container p-3">
                        <div className="flex items-center gap-2">
                          <Badge label={MODE_LABELS[c.mode] ?? c.mode} tone="info" />
                          <span className="font-medium text-sm text-on-surface">{c.title}</span>
                          {c.expectedFocus && c.expectedFocus.length > 0 && (
                            <span className="text-xs text-on-surface-variant">({c.expectedFocus.join('、')})</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-on-surface-variant line-clamp-2">{c.prompt}</p>
                        <div className="mt-1 flex flex-wrap gap-1 text-xs text-on-surface-variant">
                          {c.parameters.duration && <Badge label={`${c.parameters.duration}s`} />}
                          {c.parameters.resolution && <Badge label={c.parameters.resolution} />}
                          {c.parameters.aspectRatio && <Badge label={c.parameters.aspectRatio} />}
                          {c.sourceImageUrl && <Badge label="有源图" tone="warning" />}
                          {c.referenceUrl && <Badge label="有参考图" tone="warning" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Runs View ── */}
      {viewTab === 'runs' && (
        <div className="space-y-4">
          {runs.length === 0 ? (
            <EmptyState icon="science" title="暂无 Benchmark Run" text="先在测试集中创建 Run" />
          ) : runs.map(run => (
            <div key={run.id} className="card">
              <div className="flex items-center justify-between">
                <div className="cursor-pointer" onClick={() => openRun(run)}>
                  <h3 className="font-bold text-primary-fixed-dim">{run.name}</h3>
                  <div className="mt-1 flex gap-2 text-xs text-on-surface-variant">
                    <Badge label={STATUS_LABELS[run.status] ?? run.status} tone={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'error' : run.status === 'running' ? 'info' : 'default'} />
                    {run.liveRun && <Badge label="live" tone="warning" />}
                    <span>· {run.providerIds.length} 供应商</span>
                    <span>· {run.taskIds.length} 任务</span>
                    {run.createdAt && <span>· {new Date(run.createdAt).toLocaleDateString('zh-CN')}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {run.status === 'draft' && (
                    <button className="btn-primary text-xs" onClick={() => startRun(run.id)} disabled={!confirmLiveRun}>
                      <Icon name="play_arrow" /> 启动
                    </button>
                  )}
                  {(run.status === 'draft' || run.status === 'running') && (
                    <button className="btn-secondary text-xs" onClick={() => cancelRun(run.id)}>
                      <Icon name="close" /> 取消
                    </button>
                  )}
                </div>
              </div>

              {run.status === 'draft' && run.liveRun && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                  <Icon name="warning" className="text-yellow-400" />
                  <div className="text-xs text-yellow-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={confirmLiveRun} onChange={e => setConfirmLiveRun(e.target.checked)} className="rounded" />
                      我确认此 live-run 将产生供应商费用
                    </label>
                  </div>
                </div>
              )}

              {selectedRun?.id === run.id && runItems.length > 0 && (
                <div className="mt-4 border-t border-outline-variant/30 pt-4">
                  {/* Summary */}
                  {runSummary && (
                    <>
                      <div className="mb-4 grid grid-cols-6 gap-2">
                        <div className="rounded-lg bg-surface-container p-2 text-center">
                          <p className="text-2xs text-on-surface-variant">总计</p><p className="text-lg font-bold text-primary-fixed-dim">{runSummary.totalItems}</p>
                        </div>
                        <div className="rounded-lg bg-surface-container p-2 text-center">
                          <p className="text-2xs text-on-surface-variant">进行中</p><p className="text-lg font-bold text-info">{runSummary.createdItems + runSummary.pendingItems}</p>
                        </div>
                        <div className="rounded-lg bg-surface-container p-2 text-center">
                          <p className="text-2xs text-on-surface-variant">完成</p><p className="text-lg font-bold text-success">{runSummary.completedItems}</p>
                        </div>
                        <div className="rounded-lg bg-surface-container p-2 text-center">
                          <p className="text-2xs text-on-surface-variant">失败</p><p className="text-lg font-bold text-error">{runSummary.failedItems}</p>
                        </div>
                        <div className="rounded-lg bg-surface-container p-2 text-center">
                          <p className="text-2xs text-on-surface-variant">跳过</p><p className="text-lg font-bold text-on-surface-variant">{runSummary.skippedItems}</p>
                        </div>
                        <div className="rounded-lg bg-surface-container p-2 text-center">
                          <p className="text-2xs text-on-surface-variant">资产</p><p className="text-lg font-bold text-primary-fixed-dim">{runSummary.totalAssets}</p>
                        </div>
                      </div>
                      {/* Extended metrics */}
                      <div className="mb-4 grid grid-cols-4 gap-2">
                        {runSummary.averageRating != null && (
                          <div className="rounded-lg bg-surface-container p-2 text-center">
                            <p className="text-2xs text-on-surface-variant">平均评分</p>
                            <p className="text-sm font-bold text-yellow-400">★ {runSummary.averageRating}</p>
                          </div>
                        )}
                        {runSummary.estimatedCostTotal != null && runSummary.estimatedCostTotal > 0 && (
                          <div className="rounded-lg bg-surface-container p-2 text-center">
                            <p className="text-2xs text-on-surface-variant">估算成本</p>
                            <p className="text-sm font-bold text-on-surface">¥{runSummary.estimatedCostTotal.toFixed(3)}</p>
                          </div>
                        )}
                        {runSummary.failureCategories && runSummary.failureCategories.length > 0 && (
                          <div className="col-span-2 rounded-lg bg-surface-container p-2">
                            <p className="text-2xs text-on-surface-variant mb-1">错误分布</p>
                            <div className="flex flex-wrap gap-1">
                              {runSummary.failureCategories.slice(0, 6).map(fc => (
                                <Badge key={fc.category} label={`${fc.category}: ${fc.count}`} tone="error" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* By Provider */}
                      {runSummary.byProvider.length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-xs font-bold text-on-surface-variant mb-2">按供应商</h5>
                          <div className="grid grid-cols-3 gap-2">
                            {runSummary.byProvider.map(bp => (
                              <div key={bp.providerId} className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-2">
                                <p className="text-xs font-medium text-primary-fixed-dim">{bp.providerType}</p>
                                <div className="flex gap-2 text-2xs mt-1">
                                  <span className="text-success">完成 {bp.completedCount}</span>
                                  <span className="text-error">失败 {bp.failedCount}</span>
                                </div>
                                {bp.averageRating != null && (
                                  <p className="text-2xs text-yellow-400 mt-0.5">★ {bp.averageRating}</p>
                                )}
                                {bp.estimatedCost != null && bp.estimatedCost > 0 && (
                                  <p className="text-2xs text-on-surface-variant mt-0.5">¥{bp.estimatedCost.toFixed(3)}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* By Mode */}
                      {runSummary.byMode.length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-xs font-bold text-on-surface-variant mb-2">按模式</h5>
                          <div className="grid grid-cols-3 gap-2">
                            {runSummary.byMode.map(bm => (
                              <div key={bm.mode} className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-2">
                                <p className="text-xs font-medium text-primary-fixed-dim">{MODE_LABELS[bm.mode] ?? bm.mode}</p>
                                <div className="flex gap-2 text-2xs mt-1">
                                  <span className="text-success">完成 {bm.completedCount}</span>
                                  <span className="text-error">失败 {bm.failedCount}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <h4 className="text-sm font-bold text-primary-fixed-dim mb-2">运行结果</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-outline-variant/30 text-on-surface-variant">
                          <th className="py-2 text-left">用例</th>
                          <th className="py-2 text-left">模式</th>
                          <th className="py-2 text-left">供应商</th>
                          <th className="py-2 text-left">模型</th>
                          <th className="py-2 text-left">状态</th>
                          <th className="py-2 text-left">操作</th>
                          <th className="py-2 text-left">错误</th>
                        </tr>
                      </thead>
                      <tbody>
                        {runItems.map(item => {
                          const task = tasks.find(t => t.id === item.taskId);
                          const itemAsset = findAsset(item);
                          return (
                          <tr key={item.id} className="border-b border-outline-variant/10 hover:bg-white/5">
                            <td className="py-2 text-on-surface">{sets.find(s => s.id === run.setId)?.cases.find(c => c.id === item.caseId)?.title ?? item.caseId}</td>
                            <td className="py-2"><Badge label={MODE_LABELS[item.mode] ?? item.mode} tone="info" /></td>
                            <td className="py-2 text-on-surface-variant">{item.providerType}</td>
                            <td className="py-2 text-on-surface-variant text-2xs">{item.model}</td>
                            <td className="py-2">
                              <Badge label={ITEM_STATUS_LABELS[item.status] ?? item.status} tone={item.status === 'completed' ? 'success' : item.status === 'failed' ? 'error' : item.status === 'skipped' ? 'warning' : item.status === 'created' ? 'info' : 'default'} />
                            </td>
                            <td className="py-2">
                              <div className="flex gap-1">
                                {item.taskId && (
                                  <button className="btn-ghost text-2xs py-0.5 px-1" onClick={() => navigateToTask(item.taskId!)} title="查看任务">
                                    <Icon name="task" className="text-[10px]" /> 任务
                                  </button>
                                )}
                                {itemAsset && (
                                  <button className="btn-ghost text-2xs py-0.5 px-1" onClick={() => navigateToAsset(item.assetId ?? itemAsset.id)} title="查看资产">
                                    <Icon name="image" className="text-[10px]" /> 资产
                                  </button>
                                )}
                                {item.assetId && !itemAsset && (
                                  <button className="btn-ghost text-2xs py-0.5 px-1 text-warning" onClick={() => navigateToAsset(item.assetId!)} title="查看资产">
                                    <Icon name="image" className="text-[10px]" /> 查看
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-2 text-error text-2xs max-w-40 truncate" title={item.errorReason ?? ''}>{item.errorCode ? `${item.errorCode}` : '--'}{item.errorReason ? `: ${item.errorReason}` : ''}</td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Create Run Dialog ── */}
      {showRunDialog && selectedSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowRunDialog(false)}>
          <div className="card max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-primary-fixed-dim mb-4">创建 Benchmark Run</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-on-surface-variant">名称</label>
                <input className="input mt-1" value={runName} onChange={e => setRunName(e.target.value)} placeholder="Run 名称" />
              </div>
              <div>
                <label className="text-xs text-on-surface-variant">Benchmark Set</label>
                <p className="text-sm text-on-surface mt-1">{selectedSet.name} (v{selectedSet.version}, {selectedSet.cases.length} 用例)</p>
              </div>
              <div>
                <label className="text-xs text-on-surface-variant">选择供应商</label>
                <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                  {providers.filter(p => p.capabilities.some(c => ['T2V','I2V','R2V'].includes(c)) || p.providerType?.includes('wanxiang') || p.providerType?.includes('happyhorse')).map(p => (
                    <label key={p.id} className="flex items-center gap-2 text-sm text-on-surface cursor-pointer py-1">
                      <input type="checkbox" checked={selectedProviderIds.includes(p.id)} onChange={e => {
                        setSelectedProviderIds(e.target.checked ? [...selectedProviderIds, p.id] : selectedProviderIds.filter(id => id !== p.id));
                      }} />
                      {p.name} ({p.providerType ?? p.defaultModel})
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="liveRunToggle" checked={liveRun} onChange={e => setLiveRun(e.target.checked)} />
                <label htmlFor="liveRunToggle" className="text-sm text-warning">Live Run（真实调用供应商，会产生费用）</label>
              </div>
              {liveRun && (
                <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                  <Icon name="warning" className="text-yellow-400" />
                  <label className="flex items-center gap-2 text-xs text-yellow-300 cursor-pointer">
                    <input type="checkbox" checked={confirmLiveRun} onChange={e => setConfirmLiveRun(e.target.checked)} />
                    我确认这将产生供应商费用
                  </label>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => { setShowRunDialog(false); setLiveRun(false); setConfirmLiveRun(false); }}>取消</button>
              <button className="btn-primary" onClick={createRun} disabled={selectedProviderIds.length === 0 || (liveRun && !confirmLiveRun)}>
                创建 Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
