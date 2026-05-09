# 备份与恢复指南（v0.3）

本文档说明 API Asset Studio 的备份策略与恢复流程。

## 一、需要备份的内容

### 1.1 db.json（运行数据）

路径：`<data_dir>/db.json` 或 Docker 映射的 `./data/db.json`

包含：
- Provider 配置（api_key 已加密）
- 项目列表
- 任务记录
- 资产元数据（不含文件本身）
- Usage 记录
- Quality Feedback
- Benchmark Set / Run / RunItem
- Workspace 设置

### 1.2 Storage 文件（本地模式）

路径：`<storage_dir>/assets/`

仅 Local Storage 模式下需要备份。如果使用对象存储，文件由对象存储服务商管理。

### 1.3 APP_ENCRYPTION_KEY

⚠️ **这是最关键的一项。** 如果丢失此密钥：
- 所有已保存的 Provider API Key 将**无法解密**
- 用户需要重新输入所有 API Key
- 其他数据不受影响（只有 credential 加密）

备份方式：保存在密码管理器或安全密钥管理服务中。

## 二、备份命令

### 手动备份

```bash
# 备份 db.json
cp server/data/db.json backups/db-$(date +%Y%m%d-%H%M%S).json

# 备份 storage（本地模式）
tar -czf backups/storage-$(date +%Y%m%d-%H%M%S).tar.gz server/storage/assets/

# 备份密钥（安全保存！）
echo "APP_ENCRYPTION_KEY=your-key-here" > backups/app-key-$(date +%Y%m%d).txt
# ⚠️ 备份后立即移动到安全位置，不要留在项目目录
```

### Docker 部署下的备份

```bash
# 备份 data volume
docker cp video-ai-gen:/app/data/db.json backups/db-$(date +%Y%m%d-%H%M%S).json

# 备份 storage volume（本地模式）
docker run --rm -v video-ai-gen_storage:/data -v $(pwd)/backups:/backup alpine tar czf /backup/storage-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
```

### 定时备份（crontab 示例）

```bash
# 每天凌晨 2 点备份
0 2 * * * cp /app/data/db.json /backups/db-$(date +\%Y\%m\%d).json

# 每周日凌晨 3 点备份 storage
0 3 * * 0 tar czf /backups/storage-$(date +\%Y\%m\%d).tar.gz /app/storage/assets/
```

## 三、恢复流程

### 从 db.json 备份恢复

```bash
# 1. 停止服务
docker compose down

# 2. 恢复 db.json
cp backups/db-20260101-020000.json data/db.json

# 3. 启动服务
docker compose up -d

# 4. 验证
curl http://localhost:8787/health
```

### 从项目导出包恢复

项目导出包（ZIP）也可用于数据恢复：

```bash
# 在应用中：项目 → 导出归档
# 得到 project-export-xxx.zip

# 恢复：
# 在新实例中：项目 → 导入归档 → 选择 ZIP 文件
```

导出包不包含：Provider credential（加密字段）、Presigned URL。

## 四、对象存储备份

如果使用阿里云 OSS 或 S3：
- 对象存储本身有冗余备份（多副本/跨区域复制）
- 可在控制台配置跨区域复制规则
- 文件删除后可能进入回收站（取决于服务商配置）
- 建议开启版本控制（Versioning），防止误删

## 五、恢复限制

以下情况**无法恢复**：
- APP_ENCRYPTION_KEY 丢失 → provider API Key 不可恢复
- 本地存储文件被手动删除且无备份 → 资产文件永久丢失
- 对象存储文件被删除且未开启版本控制 → 资产文件永久丢失
- 资产文件被删除后，可尝试用 task 信息重新生成（如有原始 prompt 和参数）

## 六、备份检查清单

- [ ] db.json 有定期备份
- [ ] APP_ENCRYPTION_KEY 安全存放（密码管理器或密钥服务）
- [ ] 备份存放路径不在项目目录内（避免被误删）
- [ ] 备份文件权限正确（0600 或更严格）
- [ ] 至少保留最近 7 天的 db.json 备份
- [ ] 如使用本地 storage，storage 文件有定期备份
- [ ] 对象存储已开启版本控制（如有）
- [ ] 已测试过完整的恢复流程
