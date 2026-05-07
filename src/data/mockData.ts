import type { Asset, GenerationTask, Project, PromptTemplate, Provider } from '../types';

export const imagePool = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD0hZhpkFt6TKEjvi_1Spn9hRLbw0iOaQ0GnNuxJgKrFjt2Xm4xNXmwSuGbXOCe0Z_7fQPxMzmIgWvceiSsSLg2V50GWChYwEXQQf2CnZyGhOHI1tRmasnSzrf59l7bMVv1NdqS0f_huP4zhQLx408dvLvzYqYHFfSmTHrkts6mnLE7cILiuC7a5lkC-fKuUKyHRdUfqghJ_f3-vgJdq9OJ-0wYCMk9rVGqEjUCnkViEKR7pTSqyi-pg9_Slt6kybHK39g-7UEs',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDEh_1jN2CtipBB73Lb8o_oNz9SNrp7P55-ziGSn-2vS57wBau_LjIyScT0ASTh4J0iENePB0Ctm9nFPMDpqer8SSYmhiE7g-AwYCuqvQZ6Dao7LJLXc2lec-oCHE3Gs6vwN1FS7Ap4cHB0bOPOyRn10H2SJYveXhpmoi8AKh2jVN5UwxYM-dPmw3hm2mChnMm1corzpJ5AK8G2DhOiwFBVqzOXriuOFy6eDWiKa2qE1Vi8yECWsFBGzE4vHMLXeJVBrcKW03C3',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCxncU77aUSif7KATyEylWQxfpkjzUCAjprG-3gGIyLuDbowuxBcIV2GF1mhW6gnJaDvaMCFKTy2053s9mvsQ2oSWzIh0jLasuc6G783dctAcocMjZNwTY6RdTDFSXl9kJwdgsA7U_fgEJtF_Dp-aE59z0f0SA_usHegYBOqgzbZMGL-OCiWmX7tDrkbnprVSS-xHTCTbJStHNQyKdiiel-kgfCVVa_KEXRpYdf2a8-VZ4AHavxqqbt3H3qsNnqFja6fjnWxz63',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCh-Octh8FhvDoCK95DFzGUtrdMhP_QhZIykOHz1xRA9vmY3mF-aUA_1YDSE-kiJWAvcfJq7-qo7GCxH1dFvEn0HZ4jOOBZIiMxOoYiiAlKN-8jJU53_oJoDpeY-3Q8AYABiw4FiydPX3N62qIDKfdhjNQroYPFAXb6ofRmYcU_p2At3JV15-BgvnfnOgAyPQ0NPtJ9wQ58J5PuGi0lhMiZOjBCJP-A2b55il4l1-ZDK76tWaqJhokZktQjoLbjXYciicJPw5XL',
];

export const mockProjects: Project[] = [
  { id: 'p1', name: '品牌广告片', description: '季度发布会与产品 KV 素材', assetCount: 18, updatedAt: '2026-05-06 14:20' },
  { id: 'p2', name: '游戏概念美术', description: '角色、场景、动作参考素材', assetCount: 32, updatedAt: '2026-05-05 19:10' },
  { id: 'p3', name: '社媒短视频', description: '竖版视频与封面图生成', assetCount: 11, updatedAt: '2026-05-04 10:45' },
];

export const mockProviders: Provider[] = [
  { id: 'google', name: 'Google', baseUrl: 'https://generativelanguage.googleapis.com', defaultModel: 'Imagen / Veo', apiKeyMasked: '已配置（脱敏）', capabilities: ['图片生成', 'T2V', 'I2V', 'R2V', '负面提示词', '异步任务'], status: 'connected', isDefault: true },
  { id: 'openai', name: '万物焕新 gpt-image-2', baseUrl: 'https://api.wanwuhuanxin.cn/v1', defaultModel: 'gpt-image-2', apiKeyMasked: '已配置（脱敏）', providerType: 'openai-images', capabilities: ['图片生成'], status: 'connected' },
  { id: 'runway', name: 'Runway', baseUrl: 'https://api.runwayml.com/v1', defaultModel: 'Gen-4', capabilities: ['T2V', 'I2V', 'R2V', '首帧', '尾帧', '多参考图', '异步任务'], status: 'unconfigured' },
  { id: 'kling', name: 'Kling', baseUrl: 'https://api.klingai.com', defaultModel: 'Kling 2.0', capabilities: ['T2V', 'I2V', '首帧', '尾帧', '异步任务'], status: 'failed' },
  { id: 'minimax', name: 'MiniMax', baseUrl: 'https://api.minimax.chat', defaultModel: 'Hailuo', capabilities: ['T2V', 'I2V', '异步任务'], status: 'unconfigured' },
  { id: 'pika', name: 'Pika', baseUrl: 'https://api.pika.art', defaultModel: 'Pika 2.2', capabilities: ['T2V', 'I2V', 'R2V'], status: 'unconfigured' },
  { id: 'luma', name: 'Luma', baseUrl: 'https://api.lumalabs.ai', defaultModel: 'Dream Machine', capabilities: ['T2V', 'I2V', '首帧', '异步任务'], status: 'unconfigured' },
  { id: 'stability', name: 'Stability AI', baseUrl: 'https://api.stability.ai', defaultModel: 'Stable Image', capabilities: ['图片生成', '负面提示词', 'Seed'], status: 'unconfigured' },
  { id: 'custom', name: 'Custom Provider', baseUrl: 'https://api.example.com/v1', defaultModel: 'custom-model', capabilities: ['图片生成', 'T2V', 'I2V'], status: 'unconfigured' },
];

export const mockAssets: Asset[] = [
  { id: 'a1', type: 'image', title: '赛博城市主视觉', prompt: '雨夜赛博朋克城市，霓虹反射，电影级光影', thumbnail: imagePool[0], providerId: 'google', providerName: 'Google', model: 'Imagen', projectId: 'p1', createdAt: '2026-05-06 13:12', favorite: true, aspectRatio: '16:9', params: { style: '电影感', seed: 1204 } },
  { id: 'a2', type: 'image', title: '流体金属产品图', prompt: '黑色流体金属与青色高光，产品广告质感', thumbnail: imagePool[1], providerId: 'openai', providerName: '万物焕新', model: 'gpt-image-2', projectId: 'p1', createdAt: '2026-05-06 11:05', favorite: false, aspectRatio: '1:1', params: { style: '产品展示', seed: 9021 } },
  { id: 'a3', type: 'video', title: '建筑雾中推进镜头', prompt: '冷峻建筑在雾气中缓慢出现，推轨镜头', thumbnail: imagePool[2], providerId: 'runway', providerName: 'Runway', model: 'Gen-4', projectId: 'p2', createdAt: '2026-05-05 20:30', favorite: true, taskId: 't3', duration: 6, mode: 'T2V', params: { resolution: '1080p', motion: '低' } },
  { id: 'a4', type: 'reference', title: '角色一致性参考', prompt: '专业创作者头像，暗色科技边缘光', thumbnail: imagePool[3], providerId: 'google', providerName: 'Google', model: 'Imagen', projectId: 'p2', createdAt: '2026-05-04 16:22', favorite: false, aspectRatio: '4:3', params: { usage: '角色参考' } },
];

export const mockTasks: GenerationTask[] = [
  { id: 't1', type: 'video', mode: 'R2V', status: 'running', progress: 58, title: '角色参考生成广告片', prompt: '保持角色一致性，进入未来产品发布现场', providerId: 'runway', providerName: 'Runway', model: 'Gen-4', projectId: 'p1', projectName: '品牌广告片', createdAt: '2026-05-06 14:42', params: { duration: 6 } },
  { id: 't2', type: 'image', status: 'failed', progress: 100, title: '产品主图重绘', prompt: '极简产品图，透明玻璃材质', providerId: 'kling', providerName: 'Kling', model: 'Kling Image', projectId: 'p1', projectName: '品牌广告片', createdAt: '2026-05-06 12:18', errorReason: 'API Key 无效', params: { aspect: '1:1' } },
  { id: 't3', type: 'video', mode: 'I2V', status: 'completed', progress: 100, assetCreated: true, title: '城市主视觉动效', prompt: '镜头穿过雨夜街道，灯光流动', providerId: 'google', providerName: 'Google', model: 'Veo', projectId: 'p3', projectName: '社媒短视频', createdAt: '2026-05-05 21:00', params: { duration: 5 } },
];

export const mockPromptTemplates: PromptTemplate[] = [
  { id: 'tpl1', title: '电影级图片主视觉', category: '图片提示词', body: '{{scene}} 中的 {{character}}，{{style}}，高对比电影光，精细材质', variables: ['scene', 'character', 'style'], favorite: true },
  { id: 'tpl2', title: '产品广告片镜头', category: '广告片', body: '{{camera}} 缓慢靠近产品，{{emotion}} 氛围，背景为 {{scene}}', variables: ['camera', 'emotion', 'scene'] },
  { id: 'tpl3', title: '角色一致性 R2V', category: '角色一致性', body: '保持 {{character}} 的脸部、服装与比例一致，在 {{scene}} 中执行 {{action}}', variables: ['character', 'scene', 'action'] },
  { id: 'tpl4', title: '赛博朋克短片', category: '赛博朋克', body: '霓虹雨夜，{{character}} 穿过拥挤街区，{{camera}}，{{style}}', variables: ['character', 'camera', 'style'] },
  { id: 'tpl5', title: '镜头运动库', category: '镜头语言', body: '{{camera}}，轻微手持晃动，主体保持清晰，背景有速度感', variables: ['camera'] },
];
