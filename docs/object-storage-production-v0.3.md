# 对象存储生产配置指南（v0.3）

本文档说明 API Asset Studio 在预发/生产环境中使用对象存储的最佳实践。

## 一、推荐配置：Private Bucket + Presigned URL

**强烈推荐**使用 Private-Presigned 模式，原因：
- 资产文件不公开暴露
- 临时签名链接过期自动失效
- 支持权限控制（GET/PUT 分离）
- 访问可被对象存储审计日志记录

## 二、存储模式对比

| 模式 | 安全性 | 适用场景 | 配置复杂度 |
|------|--------|----------|------------|
| Local | 低（单机文件系统） | 开发、单机预发 | 低 |
| Object Public | 中（Bucket 公开读） | 公开素材网站 | 中 |
| Object Private-Presigned | 高（签名链接） | 生产环境 | 中 |

## 三、阿里云 OSS 配置

### Bucket 设置

```txt
Bucket 名称：video-ai-gen-assets
区域：oss-cn-hangzhou (改为实际区域)
读写权限：私有（Private）
```

### RAM 用户权限（最小权限原则）

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:PutObject",
        "oss:GetObject",
        "oss:DeleteObject"
      ],
      "Resource": [
        "acs:oss:oss-cn-hangzhou:*:video-ai-gen-assets/*"
      ]
    }
  ]
}
```

### CORS 配置

```json
[
  {
    "allowedOrigins": ["https://your-domain.com"],
    "allowedMethods": ["GET"],
    "allowedHeaders": ["*"],
    "exposeHeaders": ["ETag"],
    "maxAgeSeconds": 3600
  }
]
```

### 生命周期规则

```txt
规则 1：自动清理过期临时文件
  前缀：temp/
  过期天数：7 天
  操作：删除

规则 2：长期归档（可选）
  前缀：assets/
  过期天数：90 天
  操作：转为低频存储
```

### 访问日志

在 OSS 控制台开启日志，存储到独立日志 Bucket。

## 四、S3 兼容配置（含 MinIO）

### AWS S3

```txt
STORAGE_MODE=object-private-presigned
OBJECT_STORAGE_ENDPOINT=https://s3.us-east-1.amazonaws.com
OBJECT_STORAGE_BUCKET=video-ai-gen-assets
OBJECT_STORAGE_REGION=us-east-1
OBJECT_STORAGE_ACCESS_KEY=AKIAXXXXXX
OBJECT_STORAGE_SECRET_KEY=xxxxxxxx
```

### MinIO（本地预发）

```txt
STORAGE_MODE=object-private-presigned
OBJECT_STORAGE_ENDPOINT=http://minio:9000
OBJECT_STORAGE_BUCKET=video-ai-gen-assets
OBJECT_STORAGE_REGION=us-east-1
OBJECT_STORAGE_ACCESS_KEY=minioadmin
OBJECT_STORAGE_SECRET_KEY=minioadmin
```

注意：MinIO 仅用于本地预发验证对象存储流程，生产请使用云服务商对象存储。

## 五、环境变量

```txt
STORAGE_MODE=object-private-presigned
OBJECT_STORAGE_ENDPOINT=<your-endpoint>
OBJECT_STORAGE_BUCKET=<your-bucket>
OBJECT_STORAGE_REGION=<your-region>
OBJECT_STORAGE_ACCESS_KEY=<your-access-key>
OBJECT_STORAGE_SECRET_KEY=<your-secret-key>
```

## 六、安全约束（生产强制）

- Bucket 必须是 **Private**，不允许 Public Read
- RAM/访问密钥仅授予最小权限（PutObject + GetObject + DeleteObject）
- Access Key/Secret Key 通过环境变量传入，不写入代码
- Presigned URL 不保存到数据库（当前已实现）
- 开启 Bucket 访问日志
- 定期更换 Access Key

## 七、Public Bucket 风险说明

Public Bucket 模式虽然简单，但存在以下风险：
- 任何人拿到 URL 即可访问资产文件
- 资产链接可被爬虫索引
- 无法按用户隔离访问权限
- 无法审计访问记录

**生产环境不要使用 Public Bucket 模式。**
