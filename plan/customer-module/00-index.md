# 客户模块执行任务拆分索引

## 目标

- 将总计划拆成可直接指派、排期、跟踪的分阶段执行文档。
- 每份文档只覆盖一个阶段，保留原始任务 ID，便于串联总计划。

## 文档清单

| 文件 | 覆盖任务 | 目标 |
|---|---|---|
| `01-phase-0-contract-and-modeling.md` | `CM-001 ~ CM-005` | 冻结契约、关系建模与 P1 状态口径 |
| `02-phase-1-server-p0-core.md` | `SV-001 ~ SV-012` | 补齐 Server 侧 P0 真闭环 |
| `03-phase-2-admin-p0-integration.md` | `FE-001 ~ FE-013` | Admin 切换到真实数据流 |
| `04-phase-3-relations-and-cross-module.md` | `SV-009 ~ SV-011`、`FE-007 ~ FE-012` | 打通关系、建案入口与跨模块联动 |
| `05-phase-4-p1-bmv-productionization.md` | `P1-001 ~ P1-009` | 经营管理签承接流生产化 |
| `06-phase-5-validation-and-guard.md` | `QA-001 ~ QA-004` | 测试、修复、门禁与收尾 |

## 推荐执行顺序

1. 先执行 `01-phase-0-contract-and-modeling.md`
2. 再执行 `02-phase-1-server-p0-core.md`
3. 然后执行 `03-phase-2-admin-p0-integration.md`
4. 随后执行 `04-phase-3-relations-and-cross-module.md`
5. 最后执行 `05-phase-4-p1-bmv-productionization.md`
6. 全部完成后统一执行 `06-phase-5-validation-and-guard.md`

## 通用完成定义

每份执行文档都默认遵守以下要求：

1. 改动前先确认相关符号、接口、下游调用方真实存在。
2. 新增或修改逻辑必须补单测，优先覆盖 `model / domain / data` 或 server service/controller。
3. 测试不得发真实网络请求，必须 mock 或注入 stub。
4. 收尾顺序固定：先 `npm run fix`，再 `npm run guard`。

## 使用方式

- 如果要按团队分工，可直接按文件分配：后端、前端、联动、P1、QA。
- 如果要按迭代排期，可按文件作为 Epic，再把文档内任务拆成子任务。
- 如果要按风险推进，优先处理 `01` 与 `02`，因为它们决定后续返工成本。
