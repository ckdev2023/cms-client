# S13: Customer 字段结构化增强

## 元信息

| 项目 | 值 |
|---|---|
| Task ID | S13 |
| Phase | S — Server 地基补全 |
| 前置依赖 | 无 |
| 后续解锁 | 无 |
| 预估工时 | 0.3 天 |

## 目标

为 Customer 的 baseProfile（jsonb）增加结构化字段校验 schema，确保核心字段不丢失。对应产品文档 `06-数据模型设计 §3.1`。

## 背景

当前 Customer 使用 `baseProfile: Record<string, unknown>` 存储所有个人信息，无任何校验。产品文档要求以下结构化字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| name_cn | string | 中文名 |
| name_en | string | 英文名 |
| name_jp | string | 日文名 |
| gender | string | 性别 |
| nationality | string | 国籍 |
| birth_date | string(date) | 出生日期 |
| passport_no | string | 护照号 |
| residence_card_no | string | 在留卡号 |
| marital_status | string | 婚姻状态 |
| education | string | 学历 |
| current_status_of_residence | string | 当前在留资格 |
| residence_expiry_date | string(date) | 在留到期日 |
| language_preference | string | 语言偏好 |

## 范围

### 需要修改的文件

- `packages/server/src/modules/core/customers/customers.service.ts` — create/update 增加 baseProfile 校验
- `packages/server/src/modules/core/customers/customers.service.test.ts` — 新增校验测试

## 实现规范

1. 定义 `INDIVIDUAL_PROFILE_SCHEMA` 对象，列出各字段的类型和是否必填
2. 在 `create` 时，若 type='individual'，校验 baseProfile 至少包含 name_cn 或 name_en 或 name_jp
3. 在 `update` 时，合并后重新校验
4. 若 type='corporation'，baseProfile 无强制字段（企业客户信息在 Company 表）
5. 校验失败抛 `BadRequestException` 并附上具体缺失字段
6. **不改变数据库结构**，仍使用 jsonb 存储

## 测试要求

- individual 类型缺少所有 name 字段拒绝
- individual 类型有 name_cn 即可通过
- corporation 类型无强制字段
- baseProfile 含额外未知字段不拒绝（宽容模式）
- 现有 customers 测试仍通过

## DoD

- [ ] create/update 校验 baseProfile
- [ ] 个人客户至少一个 name 字段
- [ ] 企业客户无强制字段
- [ ] 校验失败返回具体错误信息
- [ ] 现有测试 + 新增测试通过
- [ ] `npm run server:guard` 通过

## 验证命令

```bash
cd packages/server
npm run guard
```
