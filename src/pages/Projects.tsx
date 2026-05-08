import { useState } from 'react';
import { EmptyState, Icon, SectionHeader } from '../components/ui';
import { useApp } from '../context/AppContext';
import type { Project } from '../types';

export function Projects() {
  const {
    projects,
    providers,
    currentProject,
    setCurrentProjectId,
    assets,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    favoriteProject,
    moveProjectAssets,
    exportProjectArchive,
    showToast,
  } = useApp();
  const [draft, setDraft] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState('');
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [exportOptions, setExportOptions] = useState<Record<string, { includeFiles: boolean; includeTasks: boolean; includeTemplates: boolean }>>({});

  const saveProject = () => {
    if (!draft.name.trim()) {
      showToast('请输入项目名称', 'error');
      return;
    }
    if (editingId) {
      const target = projects.find((project) => project.id === editingId);
      if (target) updateProject({ ...target, name: draft.name, description: draft.description });
    } else {
      createProject({ name: draft.name, description: draft.description });
    }
    setDraft({ name: '', description: '' });
    setEditingId('');
  };

  const editProject = (project: Project) => {
    setEditingId(project.id);
    setDraft({ name: project.name, description: project.description ?? '' });
  };

  return (
    <div>
      <SectionHeader title="项目 Projects" subtitle="按项目组织生成任务、图片、视频与提示词上下文。" />
      <section className="card mb-5">
        <h3 className="mb-3 text-lg font-bold">{editingId ? '编辑项目' : '创建项目'}</h3>
        <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
          <input className="field" placeholder="项目名称" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <input className="field" placeholder="项目描述" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          <button className="btn-primary" onClick={saveProject}><Icon name="save" />保存</button>
        </div>
      </section>

      {projects.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const projectAssets = assets.filter((asset) => asset.projectId === project.id);
            const imageCount = projectAssets.filter((asset) => asset.type === 'image').length;
            const videoCount = projectAssets.filter((asset) => asset.type === 'video').length;
            const referenceCount = projectAssets.filter((asset) => asset.type === 'reference').length;
            const cover = project.coverAssetId
              ? assets.find((asset) => asset.id === project.coverAssetId)
              : projectAssets.find((asset) => asset.type === 'image');
            const defaultProvider = providers.find((provider) => provider.id === project.defaultProviderId);
            const isCurrent = currentProject.id === project.id;
            const moveOptions = projects.filter((item) => item.id !== project.id);
            const moveTargetId = moveTargets[project.id] ?? moveOptions[0]?.id ?? '';
            const options = exportOptions[project.id] ?? { includeFiles: true, includeTasks: true, includeTemplates: true };
            const setOption = (key: keyof typeof options, value: boolean) => setExportOptions((items) => ({ ...items, [project.id]: { ...options, [key]: value } }));
            return (
              <article key={project.id} className={`card overflow-hidden ${isCurrent ? 'border-primary-fixed-dim shadow-neon' : ''}`}>
                {cover ? <img src={cover.thumbnailUrl ?? cover.thumbnail} alt={project.name} className="-mx-5 -mt-5 mb-4 aspect-video w-[calc(100%+2.5rem)] object-cover" /> : null}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {isCurrent ? <span className="chip text-primary-fixed">当前项目</span> : null}
                      {project.status === 'archived' ? <span className="chip">已归档</span> : null}
                      {project.favorite ? <span className="chip text-secondary">收藏</span> : null}
                    </div>
                    <h3 className="text-lg font-bold">{project.name}</h3>
                    <p className="mt-2 min-h-10 text-sm text-on-surface-variant">{project.description || '暂无描述'}</p>
                  </div>
                  <Icon name="folder_open" className="text-3xl text-primary-fixed-dim" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg bg-surface-container p-3"><p className="text-on-surface-variant">图片</p><p className="text-xl font-bold">{imageCount}</p></div>
                  <div className="rounded-lg bg-surface-container p-3"><p className="text-on-surface-variant">视频</p><p className="text-xl font-bold">{videoCount}</p></div>
                  <div className="rounded-lg bg-surface-container p-3"><p className="text-on-surface-variant">参考</p><p className="text-xl font-bold">{referenceCount}</p></div>
                </div>
                <p className="mt-3 text-xs text-on-surface-variant">默认供应商：{defaultProvider?.name ?? '未设置'} · 更新于 {project.updatedAt}</p>
                <div className="mt-4 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
                  <p className="mb-2 text-xs font-semibold text-on-surface">迁移资产</p>
                  <p className="mb-3 text-xs text-on-surface-variant">当前项目共有 {projectAssets.length} 个资产，可迁移到其他项目；本地文件位置不会改变。</p>
                  {moveOptions.length ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <select className="field" value={moveTargetId} onChange={(event) => setMoveTargets((items) => ({ ...items, [project.id]: event.target.value }))}>
                        {moveOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                      <button className="btn-ghost px-3" disabled={!projectAssets.length} onClick={() => moveProjectAssets(project.id, moveTargetId)}>
                        迁移全部
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-on-surface-variant">需要先创建另一个项目，才能迁移资产。</p>
                  )}
                </div>
                <div className="mt-4 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
                  <p className="mb-2 text-xs font-semibold text-on-surface">导出归档包</p>
                  <p className="mb-3 text-xs text-on-surface-variant">导出项目信息、资产元数据、任务与模板；不会包含 API Key 或 provider credential。</p>
                  <div className="mb-3 grid gap-2 text-xs sm:grid-cols-3">
                    <label className="flex items-center gap-2 rounded-lg bg-surface-container p-2"><input type="checkbox" checked={options.includeFiles} onChange={(event) => setOption('includeFiles', event.target.checked)} />包含文件</label>
                    <label className="flex items-center gap-2 rounded-lg bg-surface-container p-2"><input type="checkbox" checked={options.includeTasks} onChange={(event) => setOption('includeTasks', event.target.checked)} />包含任务</label>
                    <label className="flex items-center gap-2 rounded-lg bg-surface-container p-2"><input type="checkbox" checked={options.includeTemplates} onChange={(event) => setOption('includeTemplates', event.target.checked)} />包含模板</label>
                  </div>
                  <button className="btn-ghost w-full justify-center" onClick={() => exportProjectArchive(project.id, options)}>
                    <Icon name="archive" />导出项目归档包
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button className="btn-ghost px-2" onClick={() => setCurrentProjectId(project.id)}>设当前</button>
                  <button className="btn-ghost px-2" onClick={() => editProject(project)}>编辑</button>
                  <button className="btn-ghost px-2" onClick={() => favoriteProject(project.id)}>{project.favorite ? '取消收藏' : '收藏'}</button>
                  <button className="btn-ghost px-2" onClick={() => archiveProject(project.id)}>归档</button>
                  <button className="btn-ghost px-2 text-error" onClick={() => {
                    if (window.confirm(`确认删除项目「${project.name}」？有资产的项目会被后端阻止删除。`)) deleteProject(project.id);
                  }}>删除</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="folder_off" title="暂无项目" text="创建一个项目后，真实图片资产会按当前项目归类。" />
      )}
    </div>
  );
}
