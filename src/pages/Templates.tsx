import { useMemo, useState } from 'react';
import { EmptyState, Icon, SearchInput, SectionHeader } from '../components/ui';
import { useApp } from '../context/AppContext';
import type { PromptTemplate } from '../types';

const categories = ['全部', '图片提示词', '视频提示词', '镜头语言', '角色一致性', '广告片', '赛博朋克', '产品展示'];
const variableTokens = ['character', 'scene', 'action', 'camera', 'style', 'emotion'];
const variablePattern = /\{\{\s*([\p{L}\p{N}_]+)\s*\}\}/gu;
const exampleValues: Record<string, string> = {
  character: '银色机械臂摇滚主唱',
  scene: '雨夜霓虹街区',
  action: '穿过潮湿街道',
  camera: '低角度缓慢推进',
  style: '赛博朋克黑色电影',
  emotion: '克制、神秘、紧张',
  角色: '机械臂主角',
  场景: '夜晚公寓',
  动作: '望向窗外',
  镜头: '缓慢推近',
  风格: '写实电影感',
  情绪: '孤独而冷静',
};

function extractVariables(body: string) {
  return Array.from(new Set(Array.from(body.matchAll(variablePattern)).map((match) => match[1])));
}

function fillTemplate(body: string, values: Record<string, string>) {
  return body.replace(variablePattern, (token, key) => values[key] || token);
}

export function Templates() {
  const { templates, addTemplate, updateTemplate, deleteTemplate, duplicateTemplate, usePromptTemplate, setPendingPromptInput, showToast, setView } = useApp();
  const [category, setCategory] = useState('全部');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'usage'>('newest');
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [draft, setDraft] = useState({ title: '', category: '图片提示词', body: '', description: '' });
  const [selectedId, setSelectedId] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});

  const list = useMemo(() => templates
    .filter((template) => {
      const matchCategory = category === '全部' || template.category === category;
      const keyword = query.trim().toLowerCase();
      const matchSearch = !keyword || `${template.title} ${template.body} ${template.category}`.toLowerCase().includes(keyword);
      return matchCategory && matchSearch;
    })
    .sort((a, b) => {
      if (sort === 'usage') return (b.usageCount ?? 0) - (a.usageCount ?? 0);
      return (b.updatedAt ?? b.createdAt ?? '').localeCompare(a.updatedAt ?? a.createdAt ?? '');
    }), [templates, category, query, sort]);

  const selected = templates.find((template) => template.id === selectedId) ?? list[0];
  const selectedVariables = selected ? extractVariables(selected.body) : [];
  const preview = selected ? fillTemplate(selected.body, variables) : '';

  const save = () => {
    if (!draft.title || !draft.body) {
      showToast('请输入模板名称和内容', 'error');
      return;
    }
    const template = {
      id: editing?.id ?? `tpl_${Date.now()}`,
      title: draft.title,
      category: draft.category,
      body: draft.body,
      description: draft.description,
      variables: extractVariables(draft.body),
      favorite: editing?.favorite,
    };
    editing ? updateTemplate(template) : addTemplate(template);
    setDraft({ title: '', category: '图片提示词', body: '', description: '' });
    setEditing(null);
  };

  const startEdit = (template: PromptTemplate) => {
    setEditing(template);
    setDraft({ title: template.title, category: template.category, body: template.body, description: template.description ?? '' });
  };

  const copyFinalPrompt = async () => {
    if (!selected) return;
    await navigator.clipboard?.writeText(preview);
    await usePromptTemplate(selected.id);
    showToast('最终提示词已复制', 'success');
  };

  const sendTemplate = async (target: 'image' | 'video') => {
    if (!selected) return;
    await usePromptTemplate(selected.id);
    setPendingPromptInput({
      target,
      mode: target === 'video' ? 't2v' : undefined,
      prompt: preview,
      templateId: selected.id,
    });
    setView(target === 'image' ? 'image-studio' : 'video-studio');
    showToast('已填入模板提示词', 'success');
  };

  const fillExamples = () => {
    const next = Object.fromEntries(selectedVariables.map((variable) => [variable, exampleValues[variable] ?? `${variable} 示例内容`]));
    setVariables(next);
  };

  return (
    <div>
      <SectionHeader title="模板库 Prompt Templates" subtitle="管理可复用提示词，支持变量填充、复制和发送到工作台。" />
      <div className="mb-5 flex flex-wrap gap-2">{categories.map((item) => <button key={item} className={`btn-ghost ${category === item ? 'border-primary-fixed-dim text-primary-fixed' : ''}`} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
        <SearchInput value={query} onChange={setQuery} placeholder="搜索模板名称、分类或内容..." />
        <select className="field" value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'usage')}>
          <option value="newest">最近更新优先</option>
          <option value="usage">使用次数优先</option>
        </select>
      </div>

      <section className="card mb-5">
        <h3 className="mb-3 text-lg font-bold">{editing ? '编辑模板' : '创建模板'}</h3>
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <input className="field" placeholder="模板名称" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          <select className="field" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{categories.filter((item) => item !== '全部').map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <input className="field mt-3" placeholder="模板描述" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        <textarea className="field mt-3 min-h-24" placeholder="输入模板内容，可使用 {{character}} 等变量" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
        <div className="mt-3 flex flex-wrap gap-2">{variableTokens.map((variable) => <button key={variable} className="chip" onClick={() => setDraft((item) => ({ ...item, body: `${item.body} {{${variable}}}`.trim() }))}>{`{{${variable}}}`}</button>)}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={save}><Icon name="save" />保存模板</button>
          {editing ? <button className="btn-ghost" onClick={() => { setEditing(null); setDraft({ title: '', category: '图片提示词', body: '', description: '' }); }}>取消编辑</button> : null}
        </div>
      </section>

      {selected ? (
        <section className="card mb-5">
          <h3 className="mb-3 text-lg font-bold">变量填充预览</h3>
          <p className="mb-3 text-sm text-on-surface-variant">{selected.title}</p>
          <div className="grid gap-3 md:grid-cols-3">
            {selectedVariables.map((variable) => (
              <label key={variable} className="block text-sm">
                <span className="mb-1 block text-on-surface-variant">{`{{${variable}}}`}</span>
                <input className="field" value={variables[variable] ?? ''} onChange={(event) => setVariables((item) => ({ ...item, [variable]: event.target.value }))} />
              </label>
            ))}
          </div>
          {selectedVariables.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-ghost px-3 py-2" onClick={fillExamples}>一键使用示例值</button>
              <button className="btn-ghost px-3 py-2" onClick={() => setVariables({})}>一键清空变量</button>
            </div>
          ) : null}
          <div className="mt-4 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-sm leading-6 text-on-surface-variant">{preview}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={copyFinalPrompt}>复制最终提示词</button>
            <button className="btn-ghost" onClick={() => sendTemplate('image')}>发送到 Image Studio</button>
            <button className="btn-ghost" onClick={() => sendTemplate('video')}>发送到 Video Studio</button>
          </div>
        </section>
      ) : null}

      {list.length ? <div className="grid gap-4 lg:grid-cols-2">
        {list.map((template) => (
          <article key={template.id} className={`card ${selected?.id === template.id ? 'border-primary-fixed-dim' : ''}`}>
            <button className="block w-full text-left" onClick={() => setSelectedId(template.id)}>
              <div className="mb-3 flex items-start justify-between gap-3"><div><span className="chip">{template.category}</span><h3 className="mt-3 text-lg font-bold">{template.title}</h3></div>{template.favorite ? <Icon name="star" className="text-secondary" /> : null}</div>
              <p className="min-h-16 text-sm text-on-surface-variant">{template.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">{template.variables.map((variable) => <span key={variable} className="chip">{`{{${variable}}}`}</span>)}</div>
              <p className="mt-3 text-xs text-on-surface-variant">使用次数：{template.usageCount ?? 0}</p>
            </button>
            <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-6">
              <button className="btn-ghost px-2" onClick={() => setSelectedId(template.id)}>查看</button>
              <button className="btn-ghost px-2" onClick={() => navigator.clipboard?.writeText(template.body)}>复制</button>
              <button className="btn-ghost px-2" onClick={() => duplicateTemplate(template.id)}>复制模板</button>
              <button className="btn-ghost px-2" onClick={() => updateTemplate({ ...template, favorite: !template.favorite })}>{template.favorite ? '取消收藏' : '收藏'}</button>
              <button className="btn-ghost px-2" onClick={() => startEdit(template)}>编辑</button>
              <button className="btn-ghost px-2 text-error" onClick={() => deleteTemplate(template.id)}>删除</button>
            </div>
          </article>
        ))}
      </div> : <EmptyState icon="description" title="暂无模板" text="创建你的第一个图片或视频提示词模板。" />}
    </div>
  );
}
