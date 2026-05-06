import { SectionHeader, Icon } from '../components/ui';
import { useApp } from '../context/AppContext';

export function Settings() {
  const { projects, providers, currentProject, setCurrentProjectId, resetHistory, deleteAllKeys, showToast } = useApp();
  const defaultProvider = providers.find((provider) => provider.isDefault) ?? providers[0];

  return (
    <div>
      <SectionHeader title="设置 Settings" subtitle="管理账户、默认项、隐私控制与危险操作。" />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card border-primary-fixed-dim/30 bg-primary-fixed-dim/10 lg:col-span-2">
          <h3 className="mb-2 text-lg font-bold text-primary">第三方供应商规则说明</h3>
          <p className="text-sm leading-6 text-primary">
            平台仅提供统一创作工作台、资产管理和调用编排能力。用户通过本人 API Key 调用第三方供应商生成内容，相关费用、内容审核、版权归属、商用授权和使用限制均以对应第三方供应商的服务条款为准。平台不对第三方模型生成内容的版权、合规性或商用授权作额外承诺。
          </p>
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
        <section className="card">
          <h3 className="mb-4 text-lg font-bold">存储用量</h3>
          <div className="mb-3 flex items-end justify-between"><span className="text-3xl font-bold">2.4 GB</span><span className="text-sm text-on-surface-variant">Mock / 10 GB</span></div>
          <div className="h-2 rounded-full bg-surface-container-high"><div className="h-full w-[24%] rounded-full bg-primary-fixed-dim" /></div>
          <button className="btn-ghost mt-4" onClick={() => showToast('项目归档已导出（Mock）', 'success')}><Icon name="archive" />导出项目归档</button>
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
