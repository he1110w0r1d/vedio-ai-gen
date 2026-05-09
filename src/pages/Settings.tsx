import { useEffect, useState } from 'react';
import { API_BASE_URL, API_MODE } from '../api/client';
import { diagnosticsApi, type HealthDiagnostics } from '../api/diagnosticsApi';
import { storageApi } from '../api/storageApi';
import { SectionHeader, Icon } from '../components/ui';
import { useApp } from '../context/AppContext';
import type { StorageConfig } from '../types';
import { APP_STAGE, APP_VERSION } from '../version';

export function Settings() {
  const { projects, providers, currentProject, setCurrentProjectId, workspace, updateWorkspace, resetHistory, deleteAllKeys, showToast } = useApp();
  const defaultProvider = providers.find((provider) => provider.isDefault) ?? providers[0];
  const [workspaceDraft, setWorkspaceDraft] = useState({
    name: workspace.name,
    ownerName: workspace.ownerName ?? '',
    description: workspace.description ?? '',
    avatarUrl: workspace.avatarUrl ?? '',
    defaultProjectId: workspace.defaultProjectId ?? currentProject.id,
  });
  const [diagnostics, setDiagnostics] = useState<HealthDiagnostics | null>(null);
  const [diagnosticsError, setDiagnosticsError] = useState('');
  const [storageConfig, setStorageConfig] = useState<StorageConfig | null>(null);
  const [testingStorage, setTestingStorage] = useState(false);

  useEffect(() => {
    setWorkspaceDraft({
      name: workspace.name,
      ownerName: workspace.ownerName ?? '',
      description: workspace.description ?? '',
      avatarUrl: workspace.avatarUrl ?? '',
      defaultProjectId: workspace.defaultProjectId ?? currentProject.id,
    });
  }, [workspace, currentProject.id]);

  const copyResetCommand = () => {
    navigator.clipboard?.writeText('cd server && npm run db:reset');
    showToast('重置命令已复制', 'success');
  };

  const loadDiagnostics = async () => {
    try {
      setDiagnosticsError('');
      setDiagnostics(await diagnosticsApi.getHealth());
    } catch {
      setDiagnosticsError('无法连接后端诊断接口，请确认 server 已启动。');
      setDiagnostics(null);
    }
  };

  const loadStorageConfig = async () => {
    if (API_MODE !== 'real') return;
    try {
      setStorageConfig(await storageApi.getConfig());
    } catch {
      // ignore
    }
  };

  const saveStorageConfig = async () => {
    if (!storageConfig) return;
    try {
      const updated = await storageApi.updateConfig(storageConfig);
      setStorageConfig(updated);
      showToast('存储配置已保存', 'success');
    } catch (e: any) {
      showToast(`保存失败: ${e.message}`, 'error');
    }
  };

  const testStorageConnection = async () => {
    if (!storageConfig) return;
    setTestingStorage(true);
    try {
      await storageApi.testConnection(storageConfig);
      showToast('连接测试成功，对象存储可用', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setTestingStorage(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
    loadStorageConfig();
  }, []);

  return (
    <div>
      <SectionHeader title="设置 Settings" subtitle="管理账户、默认项、隐私控制与危险操作。" />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card lg:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">本地工作区</h3>
              <p className="mt-1 text-sm text-on-surface-variant">当前是单用户本地工作区配置，不是正式账号系统；后续可作为多用户或团队边界的扩展点。</p>
            </div>
            <span className="chip">{API_MODE === 'real' ? 'Real Mode' : 'Mock Mode'}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">工作区名称</span><input className="field" value={workspaceDraft.name} onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, name: event.target.value })} /></label>
            <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">负责人名称</span><input className="field" value={workspaceDraft.ownerName} onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, ownerName: event.target.value })} /></label>
            <label className="block text-sm md:col-span-2"><span className="mb-1 block text-on-surface-variant">描述</span><input className="field" value={workspaceDraft.description} onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, description: event.target.value })} /></label>
            <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">头像 URL（可选）</span><input className="field" value={workspaceDraft.avatarUrl} onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, avatarUrl: event.target.value })} /></label>
            <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">默认项目</span><select className="field" value={workspaceDraft.defaultProjectId} onChange={(event) => setWorkspaceDraft({ ...workspaceDraft, defaultProjectId: event.target.value })}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="btn-primary" onClick={() => updateWorkspace(workspaceDraft)}><Icon name="save" />保存工作区</button>
            <span className="text-xs text-on-surface-variant">后端地址：{API_MODE === 'real' ? API_BASE_URL : 'Mock mode 使用 localStorage'}</span>
          </div>
        </section>
        <section className="card lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">系统诊断</h3>
              <p className="mt-1 text-sm text-on-surface-variant">v{APP_VERSION} {APP_STAGE}。用于确认本地后端、数据源和文件存储状态，不返回任何敏感信息。</p>
            </div>
            <button className="btn-ghost" onClick={loadDiagnostics}><Icon name="refresh" />刷新诊断</button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-surface-container p-3 text-sm"><p className="text-on-surface-variant">后端连接</p><p className="mt-1 font-semibold">{diagnosticsError ? '异常' : diagnostics?.status ?? '检测中'}</p></div>
            <div className="rounded-xl bg-surface-container p-3 text-sm"><p className="text-on-surface-variant">后端版本</p><p className="mt-1 font-semibold">{diagnostics?.version ?? APP_VERSION}</p></div>
            <div className="rounded-xl bg-surface-container p-3 text-sm"><p className="text-on-surface-variant">当前 API Mode</p><p className="mt-1 font-semibold">{API_MODE}</p></div>
            <div className="rounded-xl bg-surface-container p-3 text-sm"><p className="text-on-surface-variant">DB 状态</p><p className="mt-1 font-semibold">{diagnostics?.dbReady ? '就绪' : API_MODE === 'mock' ? 'Mock' : '未知'}</p></div>
            <div className="rounded-xl bg-surface-container p-3 text-sm"><p className="text-on-surface-variant">图片存储</p><p className="mt-1 font-semibold">{diagnostics?.storageReady ? '就绪' : API_MODE === 'mock' ? 'Mock' : '未知'}</p></div>
            <div className="rounded-xl bg-surface-container p-3 text-sm"><p className="text-on-surface-variant">Provider Mode</p><p className="mt-1 break-words font-semibold">{diagnostics?.providerMode ?? 'frontend-mock-mode'}</p></div>
          </div>
          {diagnosticsError ? <p className="mt-3 text-sm text-error">{diagnosticsError}</p> : null}
          <p className="mt-3 text-xs text-on-surface-variant">数据源：{API_MODE === 'real' ? '本地后端 server/data/db.json' : '前端 localStorage mockData'} · 图片存储：{API_MODE === 'real' ? 'server/storage/assets/' : 'Mock URL'}</p>
        </section>
        <section className="card border-primary-fixed-dim/30 bg-primary-fixed-dim/10 lg:col-span-2">
          <h3 className="mb-2 text-lg font-bold text-primary">第三方供应商规则说明</h3>
          <p className="text-sm leading-6 text-primary">
            平台仅提供统一创作工作台、资产管理和调用编排能力。用户通过本人 API Key 调用第三方供应商生成内容，相关费用、内容审核、版权归属、商用授权和使用限制均以对应第三方供应商的服务条款为准。平台不对第三方模型生成内容的版权、合规性或商用授权作额外承诺。
          </p>
          <div className="mt-4 border-t border-primary-fixed-dim/20 pt-4">
            <h4 className="mb-2 font-bold text-primary">关于用量记录与成本估算</h4>
            <ul className="list-disc pl-5 text-sm leading-6 text-primary space-y-1">
              <li>本平台的 Usage Ledger (用量统计) 功能仅供参考。</li>
              <li>因采用 BYOK 模式，平台不直接向用户收取图片/视频生成费用，实际扣费由您所配置的各供应商账户（如阿里云百炼）承担。</li>
              <li>您可以在“用量统计”页面自行维护每个模型的价格估算规则。如果没有配置或启用规则，则仅记录调用次数。</li>
              <li>建议您定期核对供应商控制台的真实账单，以免由于模型调价或参数变动产生超出预期的费用。</li>
            </ul>
          </div>
        </section>
        <section className="card">
          <h3 className="mb-4 text-lg font-bold">账户信息</h3>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary-fixed-dim to-secondary-container" />
            <div><p className="font-bold">创作者账户</p><p className="text-sm text-on-surface-variant">本地前端 Mock 会话</p></div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">默认项目</span><select className="field" value={currentProject.id} onChange={(event) => setCurrentProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <label className="block text-sm"><span className="mb-1 block text-on-surface-variant">默认供应商</span><input className="field" value={defaultProvider?.name ?? '未设置'} readOnly /></label>
          </div>
        </section>

        {API_MODE === 'real' && storageConfig && (
          <section className="card lg:col-span-2">
            <h3 className="mb-4 text-lg font-bold">存储设置</h3>
            <p className="mb-4 text-sm text-on-surface-variant">
              对象存储用于让生成图片/视频拥有公网可访问 URL，方便 I2V/R2V、部署和跨设备访问。密钥仅在后端加密保存，不会返回前端。
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-on-surface-variant">当前存储模式</span>
                <select className="field" value={storageConfig.activeProvider} onChange={(e) => setStorageConfig({ ...storageConfig, activeProvider: e.target.value as 'local' | 'object' })}>
                  <option value="local">本地存储 (Local Storage)</option>
                  <option value="object">对象存储 (Object Storage)</option>
                </select>
              </label>
              
              <label className="block text-sm">
                <span className="mb-1 block text-on-surface-variant">供应商</span>
                <select className="field" value={storageConfig.objectProvider || 's3-compatible'} onChange={(e) => setStorageConfig({ ...storageConfig, objectProvider: e.target.value as any })}>
                  <option value="s3-compatible">S3 兼容 (AWS, 阿里云 OSS, MinIO)</option>
                  <option value="custom">自定义</option>
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-on-surface-variant">Endpoint 节点</span>
                <input className="field" value={storageConfig.endpoint || ''} onChange={(e) => setStorageConfig({ ...storageConfig, endpoint: e.target.value })} placeholder="例如：https://oss-cn-hangzhou.aliyuncs.com" />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-on-surface-variant">Bucket 名称</span>
                <input className="field" value={storageConfig.bucket || ''} onChange={(e) => setStorageConfig({ ...storageConfig, bucket: e.target.value })} placeholder="例如：my-video-assets" />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-on-surface-variant">AccessKey ID</span>
                <input className="field" value={storageConfig.accessKeyId || ''} onChange={(e) => setStorageConfig({ ...storageConfig, accessKeyId: e.target.value })} placeholder={storageConfig.maskedAccessKeyId ? `已配置: ${storageConfig.maskedAccessKeyId}` : "例如：AKIAIOSFODNN7EXAMPLE"} />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-on-surface-variant">AccessKey Secret</span>
                <input type="password" className="field" value={storageConfig.accessKeySecret || ''} onChange={(e) => setStorageConfig({ ...storageConfig, accessKeySecret: e.target.value })} placeholder={storageConfig.maskedAccessKeyId ? '留空表示不修改' : '输入密钥...'} />
              </label>

              <label className="block text-sm md:col-span-2">
                <span className="mb-1 block text-on-surface-variant">公网自定义访问 URL（可选）</span>
                <input className="field" value={storageConfig.publicBaseUrl || ''} onChange={(e) => setStorageConfig({ ...storageConfig, publicBaseUrl: e.target.value })} placeholder="例如：https://cdn.my-video-assets.com" />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-on-surface-variant">前缀 (Folder Prefix)</span>
                <input className="field" value={storageConfig.folderPrefix || ''} onChange={(e) => setStorageConfig({ ...storageConfig, folderPrefix: e.target.value })} placeholder="例如：ai-assets/" />
              </label>

              <label className="block text-sm md:col-span-2 mt-4">
                <span className="mb-1 block font-bold text-on-surface">访问模式 (Access Mode)</span>
                <select className="field w-full" value={storageConfig.accessMode || 'public'} onChange={(e) => setStorageConfig({ ...storageConfig, accessMode: e.target.value as any })}>
                  <option value="public">Public Read (公共读，资产永久公开可用)</option>
                  <option value="private-presigned">Private + Presigned URL (私有读，动态签发短时链接)</option>
                </select>
                <div className="mt-1 text-xs text-on-surface-variant">
                  Public 模式配置简单，但任何人获取 URL 都能读取内容；Private 模式更安全，需按需签发带过期时间的临时链接。
                </div>
                {storageConfig.accessMode === 'private-presigned' && (
                  <div className="mt-1 rounded-xl border border-primary-fixed-dim/20 bg-primary-fixed-dim/10 p-2 text-xs text-on-surface">
                    <p className="font-semibold">Private + Presigned URL 安全说明：</p>
                    <ul className="mt-1 space-y-1 text-on-surface-variant">
                      <li>• 资产不暴露公网直接访问链接；</li>
                      <li>• 临时链接有过期时间，前端预览默认 900 秒；</li>
                      <li>• 供应商读取素材需较长过期时间（默认 3600 秒）；</li>
                      <li>• 密钥仅在后端加密保存，从不返回前端；</li>
                      <li>• 当前不是完整权限系统，仅为单用户 BYOK 工作台；</li>
                      <li>• 生产环境建议使用私有 Bucket + Presigned URL。</li>
                    </ul>
                  </div>
                )}
              </label>

              {storageConfig.accessMode === 'private-presigned' && (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block text-on-surface-variant">前端预览链接有效期 (秒)</span>
                    <input type="number" className="field" value={storageConfig.presignedUrlExpiresInSeconds || 900} onChange={(e) => setStorageConfig({ ...storageConfig, presignedUrlExpiresInSeconds: Number(e.target.value) })} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-on-surface-variant">大模型读取临时链接有效期 (秒)</span>
                    <input type="number" className="field" value={storageConfig.providerInputUrlExpiresInSeconds || 3600} onChange={(e) => setStorageConfig({ ...storageConfig, providerInputUrlExpiresInSeconds: Number(e.target.value) })} />
                  </label>
                </>
              )}

              <label className="flex items-center gap-2 text-sm mt-7">
                <input type="checkbox" checked={storageConfig.usePathStyle || false} onChange={(e) => setStorageConfig({ ...storageConfig, usePathStyle: e.target.checked })} />
                Use Path Style (针对 MinIO 等必须勾选)
              </label>

              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" checked={storageConfig.deleteLocalAfterUpload || false} onChange={(e) => setStorageConfig({ ...storageConfig, deleteLocalAfterUpload: e.target.checked })} />
                保存/迁移至对象存储后自动删除本地文件
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button className="btn-primary" onClick={saveStorageConfig}><Icon name="save" />保存配置</button>
              <button className="btn-ghost" onClick={testStorageConnection} disabled={testingStorage}><Icon name="check_circle" />{testingStorage ? '测试中...' : '测试连接'}</button>
            </div>
          </section>
        )}
        <section className="card">
          <h3 className="mb-4 text-lg font-bold">存储用量</h3>
          <div className="mb-3 flex items-end justify-between"><span className="text-3xl font-bold">2.4 GB</span><span className="text-sm text-on-surface-variant">Mock / 10 GB</span></div>
          <div className="h-2 rounded-full bg-surface-container-high"><div className="h-full w-[24%] rounded-full bg-primary-fixed-dim" /></div>
          <button className="btn-ghost mt-4" onClick={() => showToast('请在 Projects 页面选择具体项目导出归档包', 'info')}><Icon name="archive" />查看导出入口</button>
        </section>
        <section className="card">
          <h3 className="mb-4 text-lg font-bold">数据管理</h3>
          <div className="space-y-3 text-sm leading-6 text-on-surface-variant">
            <p>Real mode 的 providers、assets、tasks、projects、promptTemplates 与 workspace 来自本地后端 `server/data/db.json`。</p>
            <p>真实图片文件保存在 `server/storage/assets/`，项目归档包可以从 Projects 页面导出。</p>
            <p>为了避免误删，前端不会直接执行数据库重置；如需清空开发数据，请在终端执行重置命令。</p>
          </div>
          <button className="btn-ghost mt-4" onClick={copyResetCommand}><Icon name="content_copy" />复制重置命令</button>
        </section>
        <section className="card">
          <h3 className="mb-4 text-lg font-bold">隐私控制</h3>
          <div className="space-y-3">
            {['不向远端保存 API Key', '任务日志隐藏密钥字段', '资产默认仅当前项目可见'].map((item) => <label key={item} className="flex items-center justify-between rounded-xl bg-surface-container p-3 text-sm"><span>{item}</span><input type="checkbox" defaultChecked /></label>)}
          </div>
        </section>
        <section className="card border-error/30">
          <h3 className="mb-4 text-lg font-bold text-error">危险操作</h3>
          <div className="grid gap-3">
            <button className="btn-ghost justify-start" onClick={resetHistory}><Icon name="delete_sweep" />清空生成历史</button>
            <button className="btn-ghost justify-start" onClick={deleteAllKeys}><Icon name="key_off" />删除所有 API Key</button>
          </div>
          <p className="mt-4 text-sm text-on-surface-variant">第三方供应商的审核、扣费、可用区域、内容政策、版权归属和商用授权以对应供应商为准。第一阶段仅保留接口层设计，不接真实 API。</p>
        </section>
      </div>
    </div>
  );
}
