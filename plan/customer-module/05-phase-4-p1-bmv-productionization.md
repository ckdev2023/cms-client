# Phase 4：P1 经营管理签生产化

## 阶段目标

- 将 prototype 中的经营管理签签约前承接流迁移到正式 server + admin。
- 形成最小可生产闭环：问卷、报价、签约、建案门禁、留痕。

## 前置条件

- `CM-004` 已冻结 P1 状态机
- `FE-003` 已让详情页切到真实数据
- 客户详情已有真实保存/刷新能力

## 子任务文件

| ID | 文件 | 聚焦范围 |
|---|---|---|
| `P1-001` | `plan/customer-module/05-phase-4/P1-001-bmv-profile-persistence.md` | `bmvProfile` 持久化、DTO 与默认状态口径 |
| `P1-002` | `plan/customer-module/05-phase-4/P1-002-send-questionnaire-action.md` | 发送问卷动作接口、前置门禁与错误语义 |
| `P1-003` | `plan/customer-module/05-phase-4/P1-003-generate-quote-action.md` | 生成报价动作接口与状态联动 |
| `P1-004` | `plan/customer-module/05-phase-4/P1-004-record-sign-action.md` | 确认签约动作、签约真值与放行基础 |
| `P1-005` | `plan/customer-module/05-phase-4/P1-005-bmv-timeline-and-comms-audit.md` | P1 动作的时间线、沟通记录与日志留痕 |
| `P1-006` | `plan/customer-module/05-phase-4/P1-006-admin-bmv-intake-card.md` | prototype 承接卡片迁移到正式 admin 详情页 |
| `P1-007` | `plan/customer-module/05-phase-4/P1-007-admin-bmv-action-handlers.md` | admin 问卷 / 报价 / 签约按钮接真实接口 |
| `P1-008` | `plan/customer-module/05-phase-4/P1-008-create-case-sign-gate.md` | 单建案 / 批量建案入口签约门禁 |
| `P1-009` | `plan/customer-module/05-phase-4/P1-009-bmv-tests-and-regression.md` | server + admin 的 P1 测试与回归收尾 |

## 建议执行顺序

1. `P1-001`：先冻结 `bmvProfile` 真值口径，避免前后端各自补默认态。
2. `P1-002 ~ P1-005`：再稳定 server 动作、状态推进与留痕语义。
3. `P1-006 ~ P1-008`：随后迁移 admin 承接卡片、动作按钮与建案门禁。
4. `P1-009`：最后统一补测试并按固定门禁收尾。

## 原子任务

| ID | 原子任务 | 主要改动点 | 依赖 |
|---|---|---|---|
| `P1-001` | 在 server 增加 `bmvProfile` 持久化口径 | customers service / mapper / dto | `CM-004` |
| `P1-002` | 增加发送问卷动作接口 | questionnaire status action | `P1-001` |
| `P1-003` | 增加生成报价动作接口 | quote status action | `P1-001` |
| `P1-004` | 增加确认签约动作接口 | sign status action + build gate | `P1-001` |
| `P1-005` | 为 P1 动作补沟通记录 / 日志留痕 | timeline/comms integration | `P1-002 ~ P1-004` |
| `P1-006` | 将 prototype 承接卡片迁移到 admin 正式详情页 | detail tab / p1 card model | `FE-003`、`P1-001` |
| `P1-007` | 将问卷 / 报价 / 签约按钮接真实接口 | admin action handlers | `P1-002 ~ P1-004`、`P1-006` |
| `P1-008` | 在 admin 建案入口接入签约门禁 | create-case gate | `P1-004`、`FE-011`、`FE-012` |
| `P1-009` | 为 P1 model / server 动作补测试 | server + admin tests | `P1-001 ~ P1-008` |

## 实施说明

1. `bmvProfile` 的字段名、空值与默认状态必须先统一，否则动作接口会反复改 DTO。
2. `P1-002 ~ P1-004` 虽然都属于 customers 动作接口，但每个动作都要独立定义状态门禁与错误语义。
3. admin 承接卡片和建案门禁都必须读取 server 真值，不得回退到 prototype 本地状态。
4. P1 测试至少要覆盖状态推进、重复点击阻断、未签约建案门禁和留痕可见性。

## 阶段验收

- 详情页可显示 `bmvProfile` 状态
- 问卷、报价、签约动作可真实推进
- 未签约不可建案，已签约可进入建案
- 每次动作都能在沟通记录或操作日志中看到留痕

## 风险提示

- 若继续复用 prototype localStorage 状态，会直接破坏生产真值来源
- 若 `bmvProfile` 字段与 DTO 不稳定，前后端会在 P1 阶段持续改接口
