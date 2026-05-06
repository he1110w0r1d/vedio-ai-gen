import { useState } from 'react';
import { EmptyState, Icon, SectionHeader } from '../components/ui';
import { useApp } from '../context/AppContext';
import type { PromptTemplate } from '../types';

const categories = ['全部', '图片提示词', '视频提示词', '镜头语言', '角色一致性', '广告片', '赛博朋克', '产品展示'];
const variables = ['{{character}}', '{{scene}}', '{{action}}', '{{camera}}', '{{style}}', '{{emotion}}'];

export function Templates() {
  const { templates, addTemplate, updateTemplate, deleteTemplate, showToast, setView } = useApp();
  const [category, setCategory] = useState('全部');
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [draft, setDraft] = useState({ title: '', category: '图片提示词', body: '' });
  const list = templates.filter((template) => category === '全部' || template.category === category);

  const save = () => {
    if (!draft.title || !draft.body) return;
    const template = { id: editing?.id ?? `tpl_${Date.now()}`, title: draft.title, category: draft.category, body: draft.body, variables: variables.filter((variable) => draft.body.includes(variable)).map((variable) => variable.replace(/[{}]/g, '')) };
    editing ? updateTemplate(template) : addTemplate(template);
    setDraft({ title: '', category: '图片提示词', body: '' });
    setEditing(null);
    showToast('模板已保存', 'success');
  };

  return (
    <div>
      <SectionHeader title="模板库 Prompt Templates" subtitle="管理可复用提示词，支持变量占位。" />
      <div className="mb-5 flex flex-wrap gap-2">{categories.map((item) => <button key={item} className={`btn-ghost ${category === item ? 'border-primary-fixed-dim text-primary-fixed' : ''}`} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <section className="card mb-5">
        <h3 className="mb-3 text-lg font-bold">{editing ? '编辑模板' : '创建模板'}</h3>
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <input className="field" placeholder="模板名称" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          <select className="field" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{categories.filter((item) => item !== '全部').map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <textarea className="field mt-3 min-h-24" placeholder="输入模板内容，可使用 {{character}} 等变量" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
        <div className="mt-3 flex flex-wrap gap-2">{variables.map((variable) => <button key={variable} className="chip" onClick={() => setDraft((item) => ({ ...item, body: `${item.body} ${variable}`.trim() }))}>{variable}</button>)}</div>
        <button className="btn-primary mt-4" onClick={save}><Icon name="save" />保存模板</button>
      </section>
      {list.length ? <div className="grid gap-4 lg:grid-cols-2">
        {list.map((template) => (
          <article key={template.id} className="card">
            <div className="mb-3 flex items-start justify-between gap-3"><div><span className="chip">{template.category}</span><h3 className="mt-3 text-lg font-bold">{template.title}</h3></div>{template.favorite ? <Icon name="star" className="text-secondary" /> : null}</div>
            <p className="min-h-16 text-sm text-on-surface-variant">{template.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">{template.variables.map((variable) => <span key={variable} className="chip">{`{{${variable}}}`}</span>)}</div>
            <div className="mt-4 grid grid-cols-4 gap-2"><button className="btn-ghost px-2" onClick={() => showToast(template.body, 'info')}>查看</button><button className="btn-ghost px-2" onClick={() => setView(template.category.includes('视频') || template.category.includes('镜头') ? 'video-studio' : 'image-studio')}>使用</button><button className="btn-ghost px-2" onClick={() => navigator.clipboard?.writeText(template.body)}>复制</button><button className="btn-ghost px-2" onClick={() => { setEditing(template); setDraft({ title: template.title, category: template.category, body: template.body }); }}>编辑</button></div>
            <button className="mt-2 text-sm text-error" onClick={() => deleteTemplate(template.id)}>删除</button>
          </article>
        ))}
      </div> : <EmptyState icon="description" title="暂无模板" text="创建你的第一个图片或视频提示词模板。" />}
    </div>
  );
}
