# 项目归档包导入设计

本文档描述 API Asset Studio 未来导入项目归档包的设计。本阶段只实现导出，不实现导入。

## 目标

导入能力用于把 `project-export/` 归档包恢复到本地工作区，支持备份恢复、迁移、交付和演示。

## 未来接口草案

```txt
POST /api/project-imports/validate
POST /api/project-imports
GET /api/project-imports/:id
```

`validate` 只读取归档包并返回校验结果，不写入数据库。`POST /api/project-imports` 在用户确认策略后写入 project、assets、tasks、promptTemplates 和本地文件。

## manifest 校验

导入前必须校验：

- `manifest.json` 存在；
- `exportVersion` 受支持；
- `appName` 为 `API Asset Studio`；
- `projectId`、`projectName`、`assetCount` 等字段类型正确；
- assets、tasks、prompt-templates 文件数量与 manifest 基本一致；
- files 目录中的文件名不能包含路径穿越片段。

## projectId 冲突处理

如果导入包中的 `projectId` 已存在，提供三种策略：

- 创建副本：生成新的 projectId，项目名追加“导入副本”；
- 合并到现有项目：保留现有 project，只导入缺失资产和任务；
- 覆盖元数据：仅限本地单用户模式，生产多用户环境默认禁用。

推荐默认策略为“创建副本”，避免误覆盖现有项目。

## assetId 冲突处理

资产 ID 冲突时：

- 生成新的 assetId；
- 在导入记录中保存 `sourceAssetId -> newAssetId` 映射；
- 同步更新 task 中关联的 assetId；
- 文件名使用新的 assetId，避免覆盖本地已有文件。

## 文件恢复策略

导入文件只能写入 `server/storage/assets/`。服务端必须：

- 对归档包内文件路径做 normalize；
- 拒绝绝对路径；
- 拒绝 `../` 路径穿越；
- 校验文件大小和 MIME 类型；
- 生成新的安全文件名；
- 不覆盖已有文件。

如果归档包缺少某个资产文件，该资产仍可作为元数据导入，但 `storageType` 应标记为 `remote` 或 `missing`，前端显示预览缺失提示。

## 是否导入任务历史

任务历史默认可选导入。导入后任务应保持历史状态，不重新触发生成：

- completed / failed / canceled 原样保留；
- queued / running / polling 应转为 canceled 或 imported，避免导入后误轮询；
- task 参数保留，便于“再次生成”。

## 是否导入模板

模板导入默认可选。模板 ID 冲突时：

- 内容相同：增加 usageCount 或跳过；
- 内容不同：复制为新模板，名称追加“导入副本”。

## 不导入 provider credential 的原则

归档包永远不包含：

- 明文 API Key；
- encryptedApiKey；
- provider credential；
- server/data/db.json 原文件；
- 用户账户密钥或远端登录信息。

导入后如果需要重新生成，应提示用户在 Provider 页面重新配置供应商 Key。

## 安全风险

主要风险包括：

- ZIP 路径穿越；
- 大文件压缩包导致磁盘占用过高；
- 伪造 manifest；
- 资产元数据中包含外部 URL；
- 多用户环境下导入到错误 workspace。

导入实现应限制单包大小、单文件大小、文件数量和允许的 MIME 类型，并写入审计日志。

## 多用户权限边界

未来多用户场景下，导入必须校验：

- 当前用户是否有 workspace 写权限；
- 目标项目是否属于当前 workspace；
- 导入的资产是否只写入当前 workspace；
- provider credential 不跨用户、不跨 workspace 迁移。

当前项目仍是单用户本地工作台，Workspace 只是轻量边界配置，不是正式用户系统。
