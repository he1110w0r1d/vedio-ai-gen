import { SectionHeader, Icon } from '../components/ui';
import { useApp } from '../context/AppContext';

export function Projects() {
  const { projects, currentProject, setCurrentProjectId, assets, tasks } = useApp();
  return (
    <div>
      <SectionHeader title="项目 Projects" subtitle="按项目组织生成任务、图片、视频与提示词上下文。" action={<button className="btn-primary"><Icon name="create_new_folder" />新建项目</button>} />
      <div className="grid gap-4 md:grid-cols-3">
        {projects.map((project) => {
          const projectTasks = tasks.filter((task) => task.projectId === project.id).length;
          const projectAssets = assets.filter((asset) => asset.projectId === project.id).length;
          return (
            <button key={project.id} onClick={() => setCurrentProjectId(project.id)} className={`card text-left transition hover:border-primary-fixed-dim/60 ${currentProject.id === project.id ? 'border-primary-fixed-dim shadow-neon' : ''}`}>
              <div className="mb-4 flex items-center justify-between">
                <Icon name="folder_open" className="text-3xl text-primary-fixed-dim" />
                {currentProject.id === project.id ? <span className="chip text-primary-fixed">当前项目</span> : null}
              </div>
              <h3 className="text-lg font-bold">{project.name}</h3>
              <p className="mt-2 min-h-10 text-sm text-on-surface-variant">{project.description}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-surface-container p-3"><p className="text-on-surface-variant">资产</p><p className="text-xl font-bold">{projectAssets || project.assetCount}</p></div>
                <div className="rounded-lg bg-surface-container p-3"><p className="text-on-surface-variant">任务</p><p className="text-xl font-bold">{projectTasks}</p></div>
              </div>
              <p className="mt-4 text-xs text-on-surface-variant">更新于 {project.updatedAt}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
