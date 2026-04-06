# S8: CommunicationLog 沟通记录模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S8 |
| Phase | S — Server 地基补全 |
| 前置依赖 | S16（Migration ✅）、S15（TimelineEntityType） |
| 后续解锁 | 无 |
| 预估工时 | 0.5 天 |

## 目标

为案件/客户沟通记录提供 CRUD API。对应产品文档 `06-数据模型设计 §3.8` + `03-MVP P0 §2.5`。

## 数据库表

表 `communication_logs` 已在 `009_core_entities.up.sql` 创建，字段：
- id, org_id, case_id(nullable), customer_id(nullable), company_id(nullable)
- channel_type, direction, subject, content_summary, full_content
- visible_to_client, created_by(FK users)
- follow_up_required, follow_up_due_at, created_at

## 范围

### 需要创建的文件

- `packages/server/src/modules/core/communication-logs/communicationLogs.service.ts`
- `packages/server/src/modules/core/communication-logs/communicationLogs.controller.ts`
- `packages/server/src/modules/core/communication-logs/communicationLogs.service.test.ts`

### 需要修改的文件

- `packages/server/src/modules/core/model/coreEntities.ts` — 新增 `CommunicationLog` 类型

## API 设计

| 方法 | 路径 | 角色要求 | 说明 |
|---|---|---|---|
| POST | `/communication-logs` | staff+ | 创建沟通记录 |
| GET | `/communication-logs` | viewer+ | 列表（`?caseId=&customerId=&companyId=&page=&limit=`） |
| GET | `/communication-logs/:id` | viewer+ | 查看单个 |
| PATCH | `/communication-logs/:id` | staff+ | 更新 |
| GET | `/communication-logs/follow-ups` | staff+ | 待跟进列表 |

## 实现规范

1. channel_type 枚举：phone / email / meeting / line / wechat / other
2. direction 枚举：inbound / outbound
3. 创建时 case_id / customer_id / company_id 至少填一个
4. follow-ups 接口：查 follow_up_required=true 且 follow_up_due_at <= now() 的记录
5. 写操作写 Timeline（entityType = `"communication_log"`）
6. 若关联 case_id，同时在 case 的 timeline 写一条记录
7. visible_to_client 标记是否可在客户 Portal 展示

## 测试要求

- CRUD 全覆盖
- 按 caseId/customerId 过滤
- follow-ups 接口验证
- 多租户隔离
- channel_type/direction 校验

## DoD

- [ ] 5 个 API 端点
- [ ] follow-ups 接口
- [ ] Timeline 双写（communication_log + case）
- [ ] org_id 隔离
- [ ] 单测覆盖
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
