import { useEffect, useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { usageApi } from '../api/usageApi';
import { qualityApi } from '../api/qualityApi';
import { SectionHeader, Icon } from '../components/ui';
import type { UsageRecord, UsageSummary, CostRule, QualitySummary, QualityFeedback } from '../types';
import { API_MODE } from '../api/client';

export function Usage() {
  const { projects, providers, setView, showToast } = useApp();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [rules, setRules] = useState<CostRule[]>([]);
  const [qualitySummary, setQualitySummary] = useState<QualitySummary | null>(null);
  const [qualityList, setQualityList] = useState<QualityFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterProject, setFilterProject] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [filterMode, setFilterMode] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const filters = {
        projectId: filterProject || undefined,
        providerId: filterProvider || undefined,
        mode: filterMode || undefined,
      };
      const [sumData, recData, ruleData, qualData, qualList] = await Promise.all([
        usageApi.getSummary(filters),
        usageApi.getRecords(filters),
        usageApi.getCostRules(),
        qualityApi.getSummary(filters),
        qualityApi.list(filters),
      ]);
      setSummary(sumData);
      setRecords(recData);
      setRules(ruleData);
      setQualitySummary(qualData);
      setQualityList(qualList);
    } catch (err) {
      showToast('无法加载用量数据', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterProject, filterProvider, filterMode]);

  const toggleRule = async (rule: CostRule) => {
    try {
      await usageApi.updateCostRule(rule.id, { enabled: !rule.enabled });
      loadData();
      showToast('规则已更新', 'success');
    } catch {
      showToast('更新规则失败', 'error');
    }
  };

  const getModeLabel = (mode: string) => {
    const map: Record<string, string> = { image: '图片生成', t2v: 'T2V 视频', i2v: 'I2V 视频', r2v: 'R2V 视频', mock: 'Mock 数据' };
    return map[mode] || mode;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-success';
      case 'failed': return 'text-error';
      case 'estimated': return 'text-primary-fixed-dim';
      case 'canceled': return 'text-on-surface-variant';
      default: return 'text-on-surface';
    }
  };

  const wastedCost = useMemo(() => {
    let total = 0;
    const fbMap = new Map(qualityList.map(fb => [fb.targetId, fb]));
    for (const record of records) {
      if (!record.estimatedCost?.amount) continue;
      if (record.status === 'failed') {
        total += record.estimatedCost.amount;
        continue;
      }
      const taskFb = fbMap.get(record.taskId);
      const isTaskUnusable = taskFb?.qualityStatus === 'unusable';
      const isAnyAssetUnusable = record.assetIds?.some(id => fbMap.get(id)?.qualityStatus === 'unusable');
      if (isTaskUnusable || isAnyAssetUnusable) {
        total += record.estimatedCost.amount;
      }
    }
    return total;
  }, [records, qualityList]);

  return (
    <div>
      <SectionHeader title="用量统计 Usage Ledger" subtitle="查看生成任务的用量台账与成本估算。" />
      
      <div className="mb-6 rounded-xl border border-warning/30 bg-warning/10 p-4 text-warning">
        <div className="flex items-center gap-2 font-bold">
          <Icon name="info" /> 本页为用量记录与估算成本
        </div>
        <p className="mt-2 text-sm leading-relaxed">
          实际扣费以各供应商控制台为准。本平台不直接计费，也不保证估算金额与供应商真实账单完全一致。此数据仅供您在 BYOK 模式下参考自身使用情况。
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <select className="field max-w-[200px]" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="">所有项目</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="field max-w-[200px]" value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)}>
          <option value="">所有供应商</option>
          {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="field max-w-[200px]" value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>
          <option value="">所有模式</option>
          <option value="image">图片生成</option>
          <option value="t2v">T2V 文生视频</option>
          <option value="i2v">I2V 图生视频</option>
          <option value="r2v">R2V 参考视频</option>
        </select>
        <button className="btn-ghost" onClick={loadData}><Icon name="refresh" />刷新</button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-on-surface-variant">加载中...</div>
      ) : summary ? (
        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="card">
              <p className="text-sm text-on-surface-variant">总任务数</p>
              <p className="text-3xl font-bold">{summary.totalTasks}</p>
            </div>
            <div className="card">
              <p className="text-sm text-on-surface-variant">成功 / 失败</p>
              <p className="text-3xl font-bold text-success">{summary.completedTasks} <span className="text-on-surface-variant">/</span> <span className="text-error">{summary.failedTasks}</span></p>
            </div>
            <div className="card">
              <p className="text-sm text-on-surface-variant">产出资产</p>
              <p className="text-3xl font-bold">{summary.totalAssets}</p>
              <p className="text-xs text-on-surface-variant">{summary.totalImages} 图 · {summary.totalVideos} 视频</p>
            </div>
            <div className="card border-primary-fixed-dim/30 bg-primary-container/10">
              <p className="text-sm text-primary-fixed-dim">估算总费用</p>
              <p className="text-3xl font-bold text-primary-fixed-dim">
                {summary.estimatedCostTotal ? `${summary.estimatedCostTotal.amount?.toFixed(2) ?? '0.00'} ${summary.estimatedCostTotal.currency}` : '未配置'}
              </p>
              <p className="text-xs text-on-surface-variant">{summary.estimatedCostTotal ? '基于启用的成本规则' : '无可用估算规则'}</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="card">
              <h3 className="mb-4 text-lg font-bold">按模式统计</h3>
              <div className="space-y-3">
                {summary.byMode.map(item => (
                  <div key={item.mode} className="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                    <span className="font-semibold">{getModeLabel(item.mode)}</span>
                    <div className="text-right">
                      <span className="mr-4 text-sm text-on-surface-variant">{item.taskCount} 任务 ({item.assetCount} 资产)</span>
                      <span className="font-bold text-primary-fixed-dim">{item.estimatedCost ? `¥${item.estimatedCost.toFixed(2)}` : '--'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            
            <section className="card">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">按供应商统计</h3>
                <button className="text-xs text-primary-fixed-dim" onClick={() => setView('provider-benchmark')}>
                  <Icon name="analytics" className="mr-1" />查看供应商对比
                </button>
              </div>
              <div className="space-y-3">
                {summary.byProvider.map(item => (
                  <div key={item.providerId} className="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                    <button
                      className="font-semibold text-left hover:text-primary-fixed-dim"
                      onClick={() => setView('provider-benchmark')}
                      title="点击查看该供应商对比"
                    >
                      {item.providerName || '未知供应商'}
                    </button>
                    <div className="text-right">
                      <span className="mr-4 text-sm text-on-surface-variant">{item.taskCount} 任务</span>
                      <span className="font-bold text-primary-fixed-dim">{item.estimatedCost ? `¥${item.estimatedCost.toFixed(2)}` : '--'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {qualitySummary && qualitySummary.totalFeedback > 0 ? (
            <section className="card">
              <h3 className="mb-4 text-lg font-bold">质量概览</h3>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl bg-surface-container-low p-3 text-center">
                  <p className="text-xs text-on-surface-variant">平均评分</p>
                  <p className="text-2xl font-bold text-yellow-400">{qualitySummary.averageRating?.toFixed(1) ?? '--'}</p>
                </div>
                <div className="rounded-xl bg-surface-container-low p-3 text-center">
                  <p className="text-xs text-on-surface-variant">优秀/可用</p>
                  <p className="text-2xl font-bold text-success">{qualitySummary.excellentCount + qualitySummary.usableCount}</p>
                </div>
                <div className="rounded-xl bg-surface-container-low p-3 text-center">
                  <p className="text-xs text-on-surface-variant">不可用</p>
                  <p className="text-2xl font-bold text-error">{qualitySummary.unusableCount}</p>
                </div>
                <div className="rounded-xl bg-surface-container-low p-3 text-center">
                  <p className="text-xs text-on-surface-variant">失败分类</p>
                  <p className="text-2xl font-bold">{qualitySummary.byFailureCategory.length}</p>
                </div>
                <div className="rounded-xl bg-surface-container-low p-3 text-center">
                  <p className="text-xs text-on-surface-variant">浪费估算成本</p>
                  <p className="text-2xl font-bold text-error">{wastedCost > 0 ? `¥${wastedCost.toFixed(2)}` : '--'}</p>
                </div>
              </div>
              {qualitySummary.byFailureCategory.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-on-surface-variant">失败原因 Top</p>
                  {qualitySummary.byFailureCategory.slice(0, 5).map(item => (
                    <div key={item.category} className="flex items-center justify-between rounded-lg bg-surface-container p-2 text-sm">
                      <span>{item.category}</span>
                      <span className="font-bold text-error">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="card">
            <h3 className="mb-4 text-lg font-bold">用量明细</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-on-surface-variant">
                    <th className="pb-3 pr-4 font-normal">时间</th>
                    <th className="pb-3 pr-4 font-normal">供应商</th>
                    <th className="pb-3 pr-4 font-normal">模式</th>
                    <th className="pb-3 pr-4 font-normal">状态</th>
                    <th className="pb-3 pr-4 font-normal">用量</th>
                    <th className="pb-3 font-normal">估算费用</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {records.map(record => (
                    <tr key={record.id}>
                      <td className="py-3 pr-4">{new Date(record.createdAt).toLocaleString()}</td>
                      <td className="py-3 pr-4">{record.providerName || 'Unknown'}</td>
                      <td className="py-3 pr-4">{getModeLabel(record.mode)}</td>
                      <td className={`py-3 pr-4 ${getStatusColor(record.status)}`}>{record.status}</td>
                      <td className="py-3 pr-4 text-on-surface-variant">
                        {record.mode === 'image' ? `${record.quantity} 张` : record.mode !== 'mock' ? `${record.durationSeconds || '--'} 秒` : '--'}
                      </td>
                      <td className="py-3 font-semibold text-primary-fixed-dim">
                        {record.estimatedCost && record.estimatedCost.confidence !== 'none' ? `${record.estimatedCost.amount?.toFixed(2)} ${record.estimatedCost.currency}` : '--'}
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-on-surface-variant">暂无记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h3 className="mb-4 text-lg font-bold">成本估算规则</h3>
            {API_MODE === 'mock' ? (
              <p className="text-sm text-on-surface-variant">Mock 模式下不支持配置真实规则。</p>
            ) : (
              <div className="space-y-3">
                {rules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between rounded-xl border border-outline-variant/40 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{rule.providerType}</span>
                        <span className="chip">{getModeLabel(rule.mode)}</span>
                      </div>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        单价: <span className="font-semibold text-on-surface">{rule.price} {rule.currency}</span> / {rule.unit}
                        {rule.note && ` · ${rule.note}`}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={rule.enabled} 
                        onChange={() => toggleRule(rule)} 
                        className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                      />
                      {rule.enabled ? '已启用' : '已停用'}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
