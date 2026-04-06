# D4f: IntakeForms 模块

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | D4f |
| Phase | D — Portal Modules |
| 前置依赖 | D4a (AppUsers)、D4b (Leads) |
| 后续解锁 | F2 (Mobile Case Feature) |
| 预估工时 | 0.5 天 |

## 目标

为用户端提供立案前信息收集表单 CRUD（IntakeForm）。

## 范围

### 需要创建的文件

- `packages/server/src/modules/portal/intake/intake.service.ts`
- `packages/server/src/modules/portal/intake/intake.controller.ts`
- `packages/server/src/modules/portal/intake/intake.service.test.ts`

### 不可修改的目录

- `packages/server/src/modules/core/`
- `packages/mobile/`

## API 设计

| 方法 | 路径 | 角色/认证 | 说明 |
|---|---|---|---|
| POST | `/intake-forms` | AppUser | 创建草稿 |
| GET | `/intake-forms/:id` | AppUser 本人 / staff+ | 查看详情 |
| GET | `/intake-forms` | AppUser 本人 / staff+ | 列表（按 leadId 筛选） |
| PATCH | `/intake-forms/:id` | AppUser 本人 | 更新草稿 |
| POST | `/intake-forms/:id/submit` | AppUser 本人 | 提交（status: draft → submitted） |

## 实现规范

1. formData 为自由 JSON（由前端定义表单字段结构）
2. 提交后不可修改（status = "submitted"）
3. 不走 RLS（intake_forms 无 org_id RLS），Service 层按 app_user_id 过滤
4. 提交时可选关联 leadId

## 测试要求

- mock `Pool`
- 覆盖 create / get / list / update / submit
- 验证提交后不可修改
- 验证只能操作本人数据

## DoD

- [ ] 5 个 API 端点可调通
- [ ] formData 自由 JSON 存储
- [ ] 提交后不可修改
- [ ] 按 app_user_id 过滤
- [ ] 单测覆盖
- [ ] `npm run guard` 通过

## 验证命令

```bash
cd packages/server
npx jest --testPathPattern=intake
npm run guard
```
