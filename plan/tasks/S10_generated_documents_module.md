# S10: GeneratedDocument 文书生成模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S10 |
| Phase | S — Server 地基补全 |
| 前置依赖 | S16（Migration ✅）、S15（TimelineEntityType） |
| 后续解锁 | 无 |
| 预估工时 | 0.5 天 |

## 目标

为案件文书生成（如申请书、理由书等）提供 CRUD + 生成流程。对应产品文档 `06-数据模型设计 §3.11` + `03-MVP P0 §2.6`。

## 数据库表

表 `generated_documents` 已在 `009_core_entities.up.sql` 创建，字段：
- id, org_id, case_id(FK), template_id(nullable), title
- version_no, output_format, file_url, status
- generated_by(FK users), approved_by(FK users)
- generated_at, approved_at

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/generated-documents/generatedDocuments.service.ts`
- `packages/server/src/modules/core/generated-documents/generatedDocuments.controller.ts`
- `packages/server/src/modules/core/generated-documents/generatedDocuments.service.test.ts`

### 需要修改的文件

- `packages/server/src/modules/core/model/coreEntities.ts` — 新增 `GeneratedDocument` 类型

## API 设计

| 方法 | 路径 | 角色要求 | 说明 |
|---|---|---|---|
| POST | `/generated-documents` | staff+ | 从模板生成文书（draft） |
| GET | `/generated-documents` | viewer+ | 按 caseId 列表 |
| GET | `/generated-documents/:id` | viewer+ | 查看单个 |
| POST | `/generated-documents/:id/approve` | manager+ | 审批 |
| POST | `/generated-documents/:id/export` | staff+ | 导出（上传到 Storage） |

## 实现规范

1. status 枚举：draft → reviewing → approved → exported
2. 创建时 version_no 自增（按 case_id + template_id 取 max + 1）
3. 生成流程（Phase 1 简化）：
   - 从 TemplatesService 获取模板
   - 占位变量替换（case/customer 数据填充）→ 存为 draft
   - file_url 可为空（draft 阶段）
4. export 时调用 StorageAdapter.upload，更新 file_url + status=exported
5. output_format：word / pdf（Phase 1 仅支持 pdf 占位）
6. 写操作写 Timeline（entityType = `"generated_document"`）

## 测试要求

- CRUD + approve + export 全覆盖
- version_no 自增验证
- status 流转验证
- StorageAdapter mock
- 多租户隔离

## DoD

- [ ] 5 个 API 端点
- [ ] 模板变量替换（简化版）
- [ ] status 流程
- [ ] version_no 自增
- [ ] 单测覆盖
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
